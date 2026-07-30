import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, NoticeTarget, TeacherProfile, Schedule, User, StudentProfile, Notice, SubjectTeacher, Subject } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles(Role.TEACHER));

// 1. Get teacher's own profile
router.get('/profile', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const teacher = await TeacherProfile.findOne({ userId })
      .populate('user', 'firstName lastName email phone profileImage')
      .populate('classrooms')
      .populate({
        path: 'subjects',
        populate: { path: 'subject' },
      });

    if (!teacher) return next(new AppError('Teacher profile not found', 404));
    res.status(200).json({ status: 'success', data: teacher });
  } catch (err) {
    next(err);
  }
});

// 1b. Get assigned subjects for teacher
router.get('/my-subjects', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const teacher = await TeacherProfile.findOne({ userId });
    if (!teacher) return next(new AppError('Teacher profile not found', 404));

    const subjectTeachers = await SubjectTeacher.find({ teacherId: teacher.id })
      .populate('subject')
      .lean();

    const assignedSubjects = subjectTeachers.map(st => (st as any).subject).filter(Boolean);

    res.status(200).json({ status: 'success', data: assignedSubjects });
  } catch (err) {
    next(err);
  }
});

// 2. Get teacher's schedule
router.get('/schedule', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const teacher = await TeacherProfile.findOne({ userId });
    if (!teacher) return next(new AppError('Teacher profile not found', 404));

    const schedules = await Schedule.find({ teacherId: teacher.id })
      .populate('classroom')
      .populate('subject')
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.status(200).json({ status: 'success', data: schedules });
  } catch (err) {
    next(err);
  }
});

// 3. Get students in teacher's class
router.get('/students', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const teacher = await TeacherProfile.findOne({ userId }).populate('classrooms');
    if (!teacher) return next(new AppError('Teacher profile not found', 404));

    // Get students from all classrooms assigned to this teacher
    const classroomIds = (teacher.classrooms as any[]).map((c) => c.id);

    const studentProfiles = await StudentProfile.find({ classroomId: { $in: classroomIds } }).distinct('userId');

    const students = await User.find({
      _id: { $in: studentProfiles },
      role: Role.STUDENT,
    })
      .populate({
        path: 'studentProfile',
        populate: { path: 'classroom' },
      })
      .sort({ firstName: 1 });

    res.status(200).json({ status: 'success', data: students });
  } catch (err) {
    next(err);
  }
});

// 4. Get today's attendance for a classroom
router.get('/attendance/:classroomId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { classroomId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const students = await StudentProfile.find({ classroomId })
      .populate('user', 'firstName lastName')
      .populate({
        path: 'attendance',
        match: { date: { $gte: today, $lt: tomorrow } },
        options: { limit: 1 },
      });

    res.status(200).json({ status: 'success', data: students });
  } catch (err) {
    next(err);
  }
});

// 5. Create a notice for class
router.post('/notice', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, content, target, classroomId } = req.body;

    const teacher = await TeacherProfile.findOne({ userId });
    if (!teacher) return next(new AppError('Teacher profile not found', 404));

    const notice = await Notice.create({
      title,
      content,
      target: (target as NoticeTarget) || NoticeTarget.PARENTS,
      classroomId: classroomId || null,
      authorId: teacher.id,
    });

    res.status(201).json({ status: 'success', data: notice });
  } catch (err) {
    next(err);
  }
});

// 6. Get notices created by this teacher
router.get('/notices', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const teacher = await TeacherProfile.findOne({ userId });
    if (!teacher) return next(new AppError('Teacher profile not found', 404));

    const notices = await Notice.find({ authorId: teacher.id })
      .populate('classroom')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: notices });
  } catch (err) {
    next(err);
  }
});

export default router;
