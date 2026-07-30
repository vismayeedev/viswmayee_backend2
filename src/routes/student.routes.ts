import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { StudentProfile, Schedule, GradeReport, Role } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles(Role.STUDENT));

// 1. Get student's class schedule
router.get('/schedule', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const student = await StudentProfile.findOne({ userId });
    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const schedules = await Schedule.find({ classroomId: student.classroomId })
      .populate('subject')
      .populate({
        path: 'teacher',
        populate: {
          path: 'user',
          select: 'firstName lastName',
        },
      })
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.status(200).json({ status: 'success', data: schedules });
  } catch (err) {
    next(err);
  }
});

// 2. Get student's grades
router.get('/grades', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const student = await StudentProfile.findOne({ userId });
    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    const grades = await GradeReport.find({ studentId: student.id })
      .sort({ publishedAt: -1 });

    res.status(200).json({ status: 'success', data: grades });
  } catch (err) {
    next(err);
  }
});

// 3. Get student profile details
router.get('/profile', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const student = await StudentProfile.findOne({ userId })
      .populate('user', 'firstName lastName email phone profileImage')
      .populate({
        path: 'classroom',
        populate: {
          path: 'teacher',
          populate: {
            path: 'user',
            select: 'firstName lastName email',
          },
        },
      })
      .populate({
        path: 'parent',
        populate: {
          path: 'user',
          select: 'firstName lastName email phone',
        },
      })
      .populate({
        path: 'busRoute',
        populate: {
          path: 'driver',
          populate: {
            path: 'user',
            select: 'firstName lastName phone',
          },
        },
      });

    if (!student) {
      return next(new AppError('Student profile not found', 404));
    }

    res.status(200).json({ status: 'success', data: student });
  } catch (err) {
    next(err);
  }
});

export default router;
