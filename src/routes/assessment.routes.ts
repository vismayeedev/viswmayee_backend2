import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import {
  Role,
  Assessment,
  AssessmentSubmission,
  TeacherProfile,
  StudentProfile,
  ParentProfile,
  Classroom,
  Subject,
  Notification,
  NotificationRecipient,
  AssessmentType
} from '../models';
import { AppError } from '../middlewares/error';
import { sendEmail } from '../utils/mailer';

const router = Router();

router.use(authenticateJWT);

// 1. Create a new Assessment (Teacher / Admin / VP / Principal)
router.post('/', authorizeRoles(Role.TEACHER, Role.ADMIN, Role.VICE_PRINCIPAL, Role.PRINCIPAL), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, description, type, classroomId, subjectId, dueDate, maxMarks, attachmentUrl } = req.body;

    if (!title || !classroomId || !subjectId || !dueDate) {
      return next(new AppError('Title, classroom, subject, and due date are required', 400));
    }

    let teacherId = req.body.teacherId || '';
    if (!teacherId) {
      if (req.user!.role === Role.TEACHER) {
        const teacher = await TeacherProfile.findOne({ userId });
        if (!teacher) return next(new AppError('Teacher profile not found', 404));
        teacherId = teacher.id;
      } else {
        // Admin / VP / Principal creating on behalf of classroom
        const classroom = await Classroom.findById(classroomId);
        teacherId = classroom?.teacherId || '';
        if (!teacherId) {
          const firstTeacher = await TeacherProfile.findOne();
          teacherId = firstTeacher?.id || '';
        }
      }
    }

    const assessment = await Assessment.create({
      title,
      description,
      type: type || AssessmentType.HOMEWORK,
      classroomId,
      teacherId,
      subjectId,
      dueDate: new Date(dueDate),
      maxMarks: maxMarks || 100,
      attachmentUrl
    });

    const populatedAssessment = await Assessment.findById(assessment.id)
      .populate('classroom')
      .populate('subject')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .lean();

    // Notify parents of students in this classroom
    const students = await StudentProfile.find({ classroomId })
      .populate({
        path: 'parent',
        populate: { path: 'user', select: 'id firstName lastName email' }
      })
      .populate({
        path: 'user',
        select: 'firstName lastName'
      });

    const classroomObj: any = populatedAssessment?.classroom;
    const subjectObj: any = populatedAssessment?.subject;
    const teacherObj: any = populatedAssessment?.teacher;
    const teacherName = teacherObj?.user ? `${teacherObj.user.firstName} ${teacherObj.user.lastName}` : 'Class Teacher';

    const parentUserIds = new Set<string>();
    const parentEmails = new Set<string>();

    students.forEach((student: any) => {
      if (student.parent && student.parent.user) {
        if (student.parent.user.id) parentUserIds.add(student.parent.user.id);
        if (student.parent.user.email) parentEmails.add(student.parent.user.email);
      }
    });

    if (parentUserIds.size > 0) {
      const notificationTitle = `New ${type || 'Homework'} Assigned: ${title}`;
      const notificationMsg = `${subjectObj?.name || 'Subject'} ${type || 'Homework'} assigned for ${classroomObj?.name || 'Class'}. Due on ${new Date(dueDate).toLocaleDateString()}.`;

      const notificationDoc = await Notification.create({
        title: notificationTitle,
        message: notificationMsg,
        channel: 'IN_APP',
        senderId: userId
      });

      const recipientDocs = Array.from(parentUserIds).map(pUserId => ({
        notificationId: notificationDoc.id,
        recipientId: pUserId,
        isRead: false
      }));

      await NotificationRecipient.insertMany(recipientDocs);

      // Socket notification emit
      const io = (global as any).io;
      if (io) {
        parentUserIds.forEach(pUserId => {
          io.to(pUserId).emit('notification', {
            title: notificationTitle,
            message: notificationMsg,
            createdAt: new Date()
          });
        });
      }
    }

    // Send email notification to parents
    if (parentEmails.size > 0) {
      const emailSubject = `[Viswa School] New ${type || 'Homework'}: ${title}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a; margin-top: 0;">📚 New Assessment / Homework Notification</h2>
          <p>Dear Parent,</p>
          <p>A new <strong>${type || 'Homework'}</strong> has been assigned to your child's class (<strong>${classroomObj?.name || 'Class'}</strong>).</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Subject:</td><td style="padding: 8px;">${subjectObj?.name || 'General'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Title:</td><td style="padding: 8px;">${title}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Assigned By:</td><td style="padding: 8px;">${teacherName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Due Date:</td><td style="padding: 8px; color: #dc2626;">${new Date(dueDate).toLocaleDateString()}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Max Marks:</td><td style="padding: 8px;">${maxMarks || 100}</td></tr>
          </table>
          ${description ? `<div style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #3b82f6; margin: 15px 0;"><strong>Instructions:</strong><p style="margin: 5px 0 0 0;">${description}</p></div>` : ''}
          <p style="margin-top: 20px;">Please check the Viswa School Parent Portal for more details.</p>
          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">Viswa School Management System &bull; Automatic Notification</p>
        </div>
      `;

      sendEmail({
        to: Array.from(parentEmails),
        subject: emailSubject,
        html: emailHtml
      }).catch(err => console.error('Error dispatching assessment email:', err));
    }

    res.status(201).json({
      status: 'success',
      data: populatedAssessment
    });
  } catch (err) {
    next(err);
  }
});

// 2. Get Assessments based on role
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let filter: any = {};

    if (role === Role.TEACHER) {
      const teacher = await TeacherProfile.findOne({ userId });
      if (!teacher) return next(new AppError('Teacher profile not found', 404));
      filter = { teacherId: teacher.id };
    } else if (role === Role.PARENT) {
      const parent = await ParentProfile.findOne({ userId });
      if (!parent) return next(new AppError('Parent profile not found', 404));

      const students = await StudentProfile.find({ parentId: parent.id });
      const classroomIds = students.map(s => s.classroomId);
      filter = { classroomId: { $in: classroomIds } };
    } else if (role === Role.STUDENT) {
      const student = await StudentProfile.findOne({ userId });
      if (!student) return next(new AppError('Student profile not found', 404));
      filter = { classroomId: student.classroomId };
    }

    const assessments = await Assessment.find(filter)
      .populate('classroom')
      .populate('subject')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate('submissions')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      data: assessments
    });
  } catch (err) {
    next(err);
  }
});

// 3. Get single assessment details
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate('classroom')
      .populate('subject')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .populate({
        path: 'submissions',
        populate: {
          path: 'student',
          populate: { path: 'user', select: 'firstName lastName' }
        }
      })
      .lean();

    if (!assessment) return next(new AppError('Assessment not found', 404));

    res.status(200).json({ status: 'success', data: assessment });
  } catch (err) {
    next(err);
  }
});

// 4. Update Assessment (Teacher / Admin / VP / Principal)
router.put('/:id', authorizeRoles(Role.TEACHER, Role.ADMIN, Role.VICE_PRINCIPAL, Role.PRINCIPAL), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, type, dueDate, maxMarks, attachmentUrl } = req.body;
    const assessment = await Assessment.findByIdAndUpdate(
      req.params.id,
      { title, description, type, dueDate, maxMarks, attachmentUrl },
      { new: true }
    )
      .populate('classroom')
      .populate('subject')
      .populate({
        path: 'teacher',
        populate: { path: 'user', select: 'firstName lastName' }
      })
      .lean();

    if (!assessment) return next(new AppError('Assessment not found', 404));

    res.status(200).json({ status: 'success', data: assessment });
  } catch (err) {
    next(err);
  }
});

// 5. Delete Assessment (Teacher / Admin / VP / Principal)
router.delete('/:id', authorizeRoles(Role.TEACHER, Role.ADMIN, Role.VICE_PRINCIPAL, Role.PRINCIPAL), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assessment = await Assessment.findByIdAndDelete(req.params.id);
    if (!assessment) return next(new AppError('Assessment not found', 404));
    await AssessmentSubmission.deleteMany({ assessmentId: req.params.id });

    res.status(200).json({ status: 'success', message: 'Assessment deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// 6. Submit Assessment / Homework (Parent / Student)
router.post('/:id/submit', authorizeRoles(Role.PARENT, Role.STUDENT), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { submissionText, studentId } = req.body;

    let targetStudentId = studentId;
    if (!targetStudentId) {
      if (req.user!.role === Role.STUDENT) {
        const student = await StudentProfile.findOne({ userId });
        if (student) targetStudentId = student.id;
      }
    }

    if (!targetStudentId) return next(new AppError('Student ID is required for submission', 400));

    const submission = await AssessmentSubmission.findOneAndUpdate(
      { assessmentId: req.params.id, studentId: targetStudentId },
      {
        submissionText,
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ status: 'success', data: submission });
  } catch (err) {
    next(err);
  }
});

export default router;
