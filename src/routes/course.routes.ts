import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, Classroom, Subject, Course, CourseModule, TeacherProfile, StudentProfile, ParentProfile } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);

// 1. Get all classrooms (for teacher/admin course setup)
router.get('/classrooms', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const classrooms = await Classroom.find().sort({ gradeLevel: 1 });
    res.status(200).json({ status: 'success', data: classrooms });
  } catch (err) {
    next(err);
  }
});

// 2. Get all subjects (for teacher/admin course setup)
router.get('/subjects', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.status(200).json({ status: 'success', data: subjects });
  } catch (err) {
    next(err);
  }
});

// 3. Get courses based on role
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let courses: any[] = [];

    if (role === Role.TEACHER) {
      const teacher = await TeacherProfile.findOne({ userId });
      if (!teacher) return next(new AppError('Teacher profile not found', 404));

      courses = await Course.find({ teacherId: teacher.id })
        .populate('classroom')
        .populate('subject')
        .populate('modules')
        .sort({ createdAt: -1 })
        .lean();
    } else if (role === Role.STUDENT) {
      const student = await StudentProfile.findOne({ userId });
      if (!student) return next(new AppError('Student profile not found', 404));

      courses = await Course.find({ classroomId: student.classroomId })
        .populate('classroom')
        .populate('subject')
        .populate({
          path: 'teacher',
          populate: {
            path: 'user',
            select: 'firstName lastName',
          },
        })
        .populate('modules')
        .sort({ createdAt: -1 })
        .lean();
    } else if (role === Role.PARENT) {
      const parent = await ParentProfile.findOne({ userId }).populate('students');
      if (!parent) return next(new AppError('Parent profile not found', 404));

      const classroomIds = (parent.students as any[]).map(s => s.classroomId);

      courses = await Course.find({ classroomId: { $in: classroomIds } })
        .populate('classroom')
        .populate('subject')
        .populate({
          path: 'teacher',
          populate: {
            path: 'user',
            select: 'firstName lastName',
          },
        })
        .populate('modules')
        .sort({ createdAt: -1 })
        .lean();
    } else if (([Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL] as Role[]).includes(role)) {
      courses = await Course.find()
        .populate('classroom')
        .populate('subject')
        .populate({
          path: 'teacher',
          populate: {
            path: 'user',
            select: 'firstName lastName',
          },
        })
        .populate('modules')
        .sort({ createdAt: -1 })
        .lean();
    }

    // Format output to include _count matching Prisma output structure
    const formattedCourses = courses.map((c: any) => ({
      ...c,
      id: c._id,
      _count: { modules: c.modules ? c.modules.length : 0 },
    }));

    res.status(200).json({ status: 'success', data: formattedCourses });
  } catch (err) {
    next(err);
  }
});

// 4. Create a course
router.post('/', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, classroomId, subjectId } = req.body;
    if (!title || !classroomId || !subjectId) {
      return next(new AppError('Title, classroomId, and subjectId are required', 400));
    }

    const userId = req.user!.id;
    const role = req.user!.role;
    let teacherId = req.body.teacherId;

    if (role === Role.TEACHER) {
      const teacher = await TeacherProfile.findOne({ userId });
      if (!teacher) return next(new AppError('Teacher profile not found', 404));
      teacherId = teacher.id;
    }

    if (!teacherId) {
      return next(new AppError('TeacherId is required', 400));
    }

    const course = await Course.create({
      title,
      description,
      classroomId,
      subjectId,
      teacherId,
    });

    const populated = await Course.findById(course.id)
      .populate('classroom')
      .populate('subject');

    res.status(201).json({ status: 'success', data: populated });
  } catch (err) {
    next(err);
  }
});

// 5. Update a course
router.put('/:id', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, classroomId, subjectId } = req.body;

    const course = await Course.findByIdAndUpdate(
      id,
      {
        title,
        description,
        classroomId,
        subjectId,
      },
      { new: true }
    )
      .populate('classroom')
      .populate('subject');

    res.status(200).json({ status: 'success', data: course });
  } catch (err) {
    next(err);
  }
});

// 6. Delete a course
router.delete('/:id', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Course.findByIdAndDelete(id);
    res.status(200).json({ status: 'success', message: 'Course deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// 7. Get modules for a course
router.get('/:courseId/modules', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const modules = await CourseModule.find({ courseId }).sort({ order: 1 });
    res.status(200).json({ status: 'success', data: modules });
  } catch (err) {
    next(err);
  }
});

// 8. Create a module
router.post('/:courseId/modules', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { title, description, order, content } = req.body;

    if (!title) {
      return next(new AppError('Title is required', 400));
    }

    const module = await CourseModule.create({
      courseId,
      title,
      description,
      order: order !== undefined ? parseInt(order) : 0,
      content,
    });

    res.status(201).json({ status: 'success', data: module });
  } catch (err) {
    next(err);
  }
});

// 9. Update a module
router.put('/:courseId/modules/:moduleId', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { moduleId } = req.params;
    const { title, description, order, content } = req.body;

    const module = await CourseModule.findByIdAndUpdate(
      moduleId,
      {
        title,
        description,
        order: order !== undefined ? parseInt(order) : undefined,
        content,
      },
      { new: true }
    );

    res.status(200).json({ status: 'success', data: module });
  } catch (err) {
    next(err);
  }
});

// 10. Delete a module
router.delete('/:courseId/modules/:moduleId', authorizeRoles(Role.TEACHER, Role.ADMIN), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { moduleId } = req.params;
    await CourseModule.findByIdAndDelete(moduleId);
    res.status(200).json({ status: 'success', message: 'Module deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
