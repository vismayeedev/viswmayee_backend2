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
      const { classroomId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNo, applyToAllWeekdays } = req.body;

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

      if (applyToAllWeekdays) {
        const weekdays = [1, 2, 3, 4, 5]; // Mon to Fri
        const createdSchedules = [];
        for (const day of weekdays) {
          const newSchedule = await Schedule.create({
            classroomId,
            subjectId,
            teacherId,
            dayOfWeek: day,
            startTime,
            endTime,
            roomNo,
          });
          createdSchedules.push(newSchedule);
        }
        return res.status(201).json({ status: 'success', data: createdSchedules, message: 'Schedule slot added for all weekdays (Monday through Friday)' });
      }

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

// 2b. Bulk copy Monday's timetable to all weekdays (Tuesday - Friday)
router.post(
  '/copy-monday',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { classroomId } = req.body;
      if (!classroomId) {
        return next(new AppError('classroomId is required', 400));
      }

      // Find all Monday slots (dayOfWeek = 1)
      const mondaySlots = await Schedule.find({ classroomId, dayOfWeek: 1 });
      if (mondaySlots.length === 0) {
        return next(new AppError('No Monday schedule slots found for this classroom. Create Monday timetable first.', 400));
      }

      // Delete existing slots for Tuesday(2), Wednesday(3), Thursday(4), Friday(5)
      await Schedule.deleteMany({ classroomId, dayOfWeek: { $in: [2, 3, 4, 5] } });

      const newSlots = [];
      const weekdays = [2, 3, 4, 5];

      for (const day of weekdays) {
        for (const slot of mondaySlots) {
          newSlots.push({
            classroomId: slot.classroomId,
            subjectId: slot.subjectId,
            teacherId: slot.teacherId,
            dayOfWeek: day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            roomNo: slot.roomNo,
          });
        }
      }

      const created = await Schedule.insertMany(newSlots);

      res.status(201).json({
        status: 'success',
        message: `Successfully copied Monday's timetable to Tuesday through Friday! (${mondaySlots.length} slots copied per day)`,
        data: created,
      });
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
