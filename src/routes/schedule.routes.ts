import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, Schedule, Subject, TeacherProfile, Classroom } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);

// 1. Get all schedules for a specific classroom
router.get('/classroom/:classroomId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { classroomId } = req.params;
    const schedules = await Schedule.find({ classroomId })
      .populate('subject')
      .populate({
        path: 'teacher',
        populate: {
          path: 'user',
          select: 'firstName lastName email',
        },
      })
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.status(200).json({ status: 'success', data: schedules });
  } catch (err) {
    next(err);
  }
});

// 2. Create a new schedule slot
router.post(
  '/',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { classroomId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNo } = req.body;

      if (!classroomId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
        return next(new AppError('All fields (classroomId, subjectId, teacherId, dayOfWeek, startTime, endTime) are required', 400));
      }

      // Check if classroom exists
      const classroomExists = await Classroom.findById(classroomId);
      if (!classroomExists) return next(new AppError('Classroom not found', 404));

      // Check if subject exists
      const subjectExists = await Subject.findById(subjectId);
      if (!subjectExists) return next(new AppError('Subject not found', 404));

      // Check if teacher exists
      const teacherExists = await TeacherProfile.findById(teacherId);
      if (!teacherExists) return next(new AppError('Teacher profile not found', 404));

      const newSchedule = await Schedule.create({
        classroomId,
        subjectId,
        teacherId,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        roomNo,
      });

      res.status(201).json({ status: 'success', data: newSchedule });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Update an existing schedule slot
router.put(
  '/:id',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { subjectId, teacherId, dayOfWeek, startTime, endTime, roomNo } = req.body;

      const schedule = await Schedule.findById(id);
      if (!schedule) return next(new AppError('Schedule slot not found', 404));

      if (subjectId) {
        const subjectExists = await Subject.findById(subjectId);
        if (!subjectExists) return next(new AppError('Subject not found', 404));
        schedule.subjectId = subjectId;
      }

      if (teacherId) {
        const teacherExists = await TeacherProfile.findById(teacherId);
        if (!teacherExists) return next(new AppError('Teacher profile not found', 404));
        schedule.teacherId = teacherId;
      }

      if (dayOfWeek !== undefined) {
        schedule.dayOfWeek = parseInt(dayOfWeek);
      }

      if (startTime) schedule.startTime = startTime;
      if (endTime) schedule.endTime = endTime;
      if (roomNo !== undefined) schedule.roomNo = roomNo;

      await schedule.save();

      res.status(200).json({ status: 'success', data: schedule });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Delete a schedule slot
router.delete(
  '/:id',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deleted = await Schedule.findByIdAndDelete(id);
      if (!deleted) return next(new AppError('Schedule slot not found', 404));

      res.status(200).json({ status: 'success', message: 'Schedule slot deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
