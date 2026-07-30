import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, User, Attendance, LeaveRequest } from '../models';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles(Role.VICE_PRINCIPAL, Role.ADMIN, Role.PRINCIPAL));

// 1. Get all teachers with today's attendance status
router.get('/teachers', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const teachers = await User.find({ role: Role.TEACHER })
      .populate({
        path: 'teacherProfile',
        populate: [
          { path: 'classrooms' },
          { path: 'subjects', populate: { path: 'subject' } },
        ],
      })
      .select('firstName lastName email phone status')
      .lean();

    // Attach today's attendance status for each teacher
    const teacherAttendance = await Attendance.find({
      teacherId: { $in: teachers.map((t: any) => t._id) },
      date: { $gte: today, $lt: tomorrow },
    });

    const attendanceMap = new Map(teacherAttendance.map((a: any) => [a.teacherId, a.status]));

    const result = teachers.map((t: any) => ({
      ...t,
      id: t._id,
      todayAttendance: attendanceMap.get(t._id.toString()) || null,
    }));

    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
});

// 2. Get discipline cases
router.get('/discipline', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cases = await LeaveRequest.find({ userRole: Role.STUDENT })
      .populate({
        path: 'studentProfile',
        populate: [
          { path: 'user', select: 'firstName lastName' },
          { path: 'classroom' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: cases });
  } catch (err) {
    next(err);
  }
});

// 3. Get VP dashboard stats
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalTeachers, pendingLeaves, presentToday] = await Promise.all([
      User.countDocuments({ role: Role.TEACHER }),
      LeaveRequest.countDocuments({ status: 'PENDING' }),
      Attendance.countDocuments({
        status: 'PRESENT',
        date: { $gte: today, $lt: tomorrow },
        teacherId: { $ne: null },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: { 
        totalTeachers, 
        pendingLeaves, 
        presentToday, 
        absentToday: totalTeachers - presentToday 
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
