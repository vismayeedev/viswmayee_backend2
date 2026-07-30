import { 
  Attendance, 
  AttendanceStatus, 
  User, 
  StudentProfile, 
  Schedule 
} from '../models';
import { AppError } from '../middlewares/error';

export class AttendanceService {
  async markAttendance(data: {
    studentId?: string;
    teacherId?: string;
    date: Date | string;
    status: AttendanceStatus;
    remarks?: string;
    recordedById: string;
  }) {
    const targetDate = new Date(data.date);
    targetDate.setHours(0, 0, 0, 0);

    if (data.studentId) {
      return Attendance.findOneAndUpdate(
        { studentId: data.studentId, date: targetDate },
        {
          studentId: data.studentId,
          date: targetDate,
          status: data.status,
          remarks: data.remarks,
          recordedById: data.recordedById,
        },
        { upsert: true, new: true }
      );
    } else if (data.teacherId) {
      return Attendance.findOneAndUpdate(
        { teacherId: data.teacherId, date: targetDate },
        {
          teacherId: data.teacherId,
          date: targetDate,
          status: data.status,
          remarks: data.remarks,
          recordedById: data.recordedById,
        },
        { upsert: true, new: true }
      );
    } else {
      throw new AppError('Either studentId or teacherId must be provided', 400);
    }
  }

  async getAttendancePercentage(studentId: string) {
    const records = await Attendance.find({ studentId });

    if (records.length === 0) return 100;

    const presentOrExcused = records.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EXCUSED || r.status === AttendanceStatus.LATE
    ).length;

    return Math.round((presentOrExcused / records.length) * 100);
  }

  async getAttendanceReport(studentId: string, startDate?: string, endDate?: string) {
    const query: any = { studentId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    return Attendance.find(query).sort({ date: -1 });
  }

  async getClassAttendanceReport(classroomId: string, date: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const studentIds = await StudentProfile.find({ classroomId }).distinct('_id');

    return Attendance.find({
      studentId: { $in: studentIds },
      date: targetDate,
    }).populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'firstName lastName',
      },
    });
  }

  async getStaffAttendanceReport(date: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const staffUsers = await User.find({
      role: { $in: ['TEACHER', 'STAFF'] },
      status: 'ACTIVE',
    }).select('id firstName lastName role').lean();

    const attendanceRecords = await Attendance.find({
      teacherId: { $in: staffUsers.map((u) => u.id) },
      date: targetDate,
    });

    return staffUsers.map((u: any) => {
      const record = attendanceRecords.find((r) => r.teacherId === u.id);
      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        status: record ? record.status : 'PRESENT',
      };
    });
  }

  async getDetailedAttendanceReport(classroomId: string, subjectId?: string, dateStr?: string) {
    const targetDate = new Date(dateStr || Date.now());
    targetDate.setHours(0, 0, 0, 0);

    const students = await StudentProfile.find({ classroomId })
      .populate('user', 'id firstName lastName email')
      .populate({
        path: 'attendance',
        match: { date: targetDate },
        options: { limit: 1 },
      });

    // Programmatically sort by firstName since user is populated
    students.sort((a: any, b: any) => {
      const firstNameA = a.user?.firstName || '';
      const firstNameB = b.user?.firstName || '';
      return firstNameA.localeCompare(firstNameB);
    });

    let teacher = null;
    let schedule = null;

    if (subjectId) {
      schedule = await Schedule.findOne({ classroomId, subjectId })
        .populate({
          path: 'teacher',
          populate: {
            path: 'user',
            select: 'firstName lastName',
          },
        });
      
      if (schedule && schedule.teacher && schedule.teacher.user) {
        teacher = `${schedule.teacher.user.firstName} ${schedule.teacher.user.lastName}`;
      }
    }

    return {
      date: targetDate,
      students: students.map((s: any) => ({
        id: s.id,
        admissionNo: s.admissionNo,
        name: s.user ? `${s.user.firstName} ${s.user.lastName}` : 'N/A',
        email: s.user ? s.user.email : 'N/A',
        attendance: s.attendance && s.attendance[0] ? s.attendance[0] : null,
      })),
      teacher,
      schedule: schedule ? {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        roomNo: schedule.roomNo,
      } : null,
    };
  }
}
