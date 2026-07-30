import { 
  LeaveRequest, 
  LeaveStatus, 
  LeaveType, 
  Role, 
  AttendanceStatus, 
  ParentProfile, 
  StaffProfile, 
  StudentProfile, 
  TeacherProfile, 
  User, 
  Attendance 
} from '../models';
import { AppError } from '../middlewares/error';
import { NotificationService } from './notification.service';

const notificationService = new NotificationService();

export class LeaveService {
  async applyLeave(data: {
    userId: string;
    role: Role;
    leaveType: LeaveType;
    startDate: Date | string;
    endDate: Date | string;
    reason: string;
    assignedTeacherId?: string;
    studentProfileId?: string;
  }) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    // Dynamic profiles
    let parentProfileId: string | undefined;
    let staffProfileId: string | undefined;
    let studentProfileId: string | undefined;

    if (data.role === Role.PARENT) {
      const parent = await ParentProfile.findOne({ userId: data.userId });
      if (parent) parentProfileId = parent.id;
      studentProfileId = data.studentProfileId;
    } else if (data.role === Role.STAFF) {
      const staff = await StaffProfile.findOne({ userId: data.userId });
      if (staff) staffProfileId = staff.id;
    } else if (data.role === Role.STUDENT) {
      const student = await StudentProfile.findOne({ userId: data.userId });
      if (student) studentProfileId = student.id;
    }

    const request = await LeaveRequest.create({
      userId: data.userId,
      userRole: data.role,
      leaveType: data.leaveType,
      startDate: start,
      endDate: end,
      reason: data.reason,
      status: LeaveStatus.PENDING,
      assignedTeacherId: data.assignedTeacherId,
      parentProfileId,
      staffProfileId,
      studentProfileId,
    });

    // Notify appropriate approver
    if (data.role === Role.PARENT && data.assignedTeacherId) {
      const teacher = await TeacherProfile.findById(data.assignedTeacherId).populate('user');
      if (teacher && teacher.user) {
        await notificationService.createNotification({
          title: 'New Leave Request from Parent',
          message: `A parent has submitted a leave request from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} for your approval.`,
          channel: 'IN_APP',
          recipientIds: [teacher.user.id],
        });
      }
    } else if (data.role === Role.TEACHER) {
      // VP approval needed
      const vps = await User.find({ role: Role.VICE_PRINCIPAL });
      await notificationService.createNotification({
        title: 'Teacher Leave Request',
        message: `A teacher has submitted a leave request from ${start.toLocaleDateString()} to ${end.toLocaleDateString()} for your review.`,
        channel: 'IN_APP',
        recipientIds: vps.map((vp) => vp.id),
      });
    }

    return request;
  }

  async updateLeaveStatus(requestId: string, approverId: string, approverRole: Role, status: LeaveStatus, rejectionReason?: string) {
    const request = await LeaveRequest.findById(requestId);

    if (!request) {
      throw new AppError('Leave request not found', 404);
    }

    if (request.status === LeaveStatus.APPROVED || request.status === LeaveStatus.REJECTED) {
      throw new AppError('Leave request already completed', 400);
    }

    let nextStatus = status;

    if (status === LeaveStatus.APPROVED) {
      if (request.userRole === Role.PARENT) {
        // Teacher can approve Parent Leave directly
        if (approverRole !== Role.TEACHER && approverRole !== Role.ADMIN) {
          throw new AppError('Only teachers or admins can approve parent leaves', 403);
        }
        nextStatus = LeaveStatus.APPROVED;
      } else if (request.userRole === Role.TEACHER) {
        // Teacher requests go: Teacher -> VP -> Principal
        if (approverRole === Role.VICE_PRINCIPAL) {
          nextStatus = LeaveStatus.APPROVED_BY_VP;
          
          // Notify Principal
          const principals = await User.find({ role: Role.PRINCIPAL });
          await notificationService.createNotification({
            title: 'Leave Request Approved by VP (Pending Principal Final Sign-off)',
            message: `A teacher leave request has been approved by the VP and is pending your final sign-off.`,
            channel: 'IN_APP',
            recipientIds: principals.map((p) => p.id),
          });
        } else if (approverRole === Role.PRINCIPAL || approverRole === Role.ADMIN) {
          nextStatus = LeaveStatus.APPROVED;
        } else {
          throw new AppError('Unauthorized role to approve teacher leave request', 403);
        }
      } else {
        // Default direct approval for Staff/Admin
        if (approverRole !== Role.PRINCIPAL && approverRole !== Role.VICE_PRINCIPAL && approverRole !== Role.ADMIN) {
          throw new AppError('Unauthorized role to approve leave request', 403);
        }
        nextStatus = LeaveStatus.APPROVED;
      }
    }

    const updated = await LeaveRequest.findByIdAndUpdate(
      requestId,
      {
        status: nextStatus,
        rejectionReason: status === LeaveStatus.REJECTED ? rejectionReason : null,
        assignedVPId: approverRole === Role.VICE_PRINCIPAL ? approverId : undefined,
        assignedPrincipalId: approverRole === Role.PRINCIPAL ? approverId : undefined,
      },
      { new: true }
    );

    // Notify requester
    await notificationService.createNotification({
      title: `Leave Request Status: ${nextStatus.replace(/_/g, ' ')}`,
      message: `Your leave request has been ${nextStatus.toLowerCase()}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      channel: 'IN_APP',
      recipientIds: [request.userId],
    });

    // If final approved, write excused records to attendance
    if (nextStatus === LeaveStatus.APPROVED) {
      const current = new Date(request.startDate);
      const end = new Date(request.endDate);

      while (current <= end) {
        // Mark Student excused (if Parent request)
        if (request.parentProfileId) {
          const parent = await ParentProfile.findById(request.parentProfileId).populate('students');
          if (parent && parent.students && parent.students.length > 0) {
            for (const student of parent.students as any[]) {
              await Attendance.findOneAndUpdate(
                { studentId: student.id, date: new Date(current) },
                {
                  studentId: student.id,
                  date: new Date(current),
                  status: AttendanceStatus.EXCUSED,
                  remarks: 'Approved Leave',
                  recordedById: approverId,
                },
                { upsert: true, new: true }
              );
            }
          }
        } else {
          // Mark User profile (Teacher/Staff) excused
          await Attendance.findOneAndUpdate(
            { teacherId: request.userId, date: new Date(current) },
            {
              teacherId: request.userId,
              date: new Date(current),
              status: AttendanceStatus.EXCUSED,
              remarks: 'Approved Leave',
              recordedById: approverId,
            },
            { upsert: true, new: true }
          );
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return updated;
  }

  async getLeavesByUser(userId: string) {
    return LeaveRequest.find({ userId }).sort({ createdAt: -1 });
  }

  async getPendingLeaves(role: Role) {
    if (role === Role.TEACHER) {
      // Teachers approve parent leave requests assigned to them
      return LeaveRequest.find({
        userRole: Role.PARENT,
        status: LeaveStatus.PENDING,
      })
        .populate('user', 'firstName lastName email phone')
        .populate({
          path: 'parentProfile',
          populate: {
            path: 'user',
            select: 'firstName lastName',
          },
        })
        .populate({
          path: 'studentProfile',
          populate: [
            { path: 'user', select: 'firstName lastName' },
            { path: 'classroom', select: 'name gradeLevel' }
          ]
        });
    } else if (role === Role.VICE_PRINCIPAL) {
      // VPs review teacher leaves, staff leaves, and parent leaves
      return LeaveRequest.find({
        userRole: { $in: [Role.TEACHER, Role.STAFF, Role.PARENT] },
        status: LeaveStatus.PENDING,
      })
        .populate('user', 'firstName lastName email role')
        .populate({
          path: 'studentProfile',
          populate: [
            { path: 'user', select: 'firstName lastName' },
            { path: 'classroom', select: 'name gradeLevel' }
          ]
        })
        .populate({
          path: 'parentProfile',
          populate: { path: 'user', select: 'firstName lastName' }
        });
    } else if (role === Role.PRINCIPAL) {
      // Principals review VP approved teacher leaves, escalated leaves, staff leaves, and parent leaves
      return LeaveRequest.find({
        status: { $in: [LeaveStatus.PENDING, LeaveStatus.APPROVED_BY_VP] },
      })
        .populate('user', 'firstName lastName email role')
        .populate({
          path: 'studentProfile',
          populate: [
            { path: 'user', select: 'firstName lastName' },
            { path: 'classroom', select: 'name gradeLevel' }
          ]
        })
        .populate({
          path: 'parentProfile',
          populate: { path: 'user', select: 'firstName lastName' }
        });
    } else {
      const leaves = await LeaveRequest.find()
        .populate({
          path: 'studentProfile',
          populate: {
            path: 'classroom',
          },
        })
        .sort({ createdAt: -1 })
        .lean();

      const userIds = leaves.map(l => l.userId);
      const users = await User.find({
        _id: { $in: userIds },
      }).select('firstName lastName email role').lean();

      const userMap = new Map(users.map((u: any) => [u.id, u]));

      return leaves.map((l: any) => ({
        ...l,
        user: userMap.get(l.userId) || null,
        id: l._id,
      }));
    }
  }
}
