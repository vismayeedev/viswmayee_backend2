import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, ParentProfile, StudentProfile, Attendance, GradeReport } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles(Role.PARENT));

// Helper middleware to verify parent owns the student
const verifyChildOwnership = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parentUserId = req.user!.id;
    const { studentId } = req.params;

    const parent = await ParentProfile.findOne({ userId: parentUserId });

    if (!parent) {
      return next(new AppError('Parent profile not found', 404));
    }

    const student = await StudentProfile.findOne({
      _id: studentId,
      parentId: parent.id,
    });

    if (!student) {
      return next(new AppError('Unauthorized: Access denied to student details', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

// 1. Get children details
router.get('/children', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const parent = await ParentProfile.findOne({ userId });

    if (!parent) {
      return next(new AppError('Parent profile not found', 404));
    }

    const children = await StudentProfile.find({ parentId: parent.id })
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
        path: 'busRoute',
        populate: {
          path: 'driver',
          populate: {
            path: 'user',
            select: 'firstName lastName phone',
          },
        },
      });

    res.status(200).json({ status: 'success', data: children });
  } catch (err) {
    next(err);
  }
});

// 2. Get child's attendance history
router.get('/children/:studentId/attendance', verifyChildOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const attendance = await Attendance.find({ studentId }).sort({ date: -1 });

    // Also compute overall percentage
    const totalRecords = attendance.length;
    const presentOrExcused = attendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'EXCUSED' || a.status === 'LATE'
    ).length;

    const rate = totalRecords > 0 ? Math.round((presentOrExcused / totalRecords) * 100) : 100;

    res.status(200).json({
      status: 'success',
      data: {
        records: attendance,
        percentage: rate,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. Get child's grade reports
router.get('/children/:studentId/grades', verifyChildOwnership, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const grades = await GradeReport.find({ studentId }).sort({ publishedAt: -1 });

    res.status(200).json({ status: 'success', data: grades });
  } catch (err) {
    next(err);
  }
});

export default router;
