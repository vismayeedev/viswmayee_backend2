import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, Classroom, Subject, SubjectTeacher, TeacherProfile } from '../models';
import { Response, NextFunction } from 'express';
import { AppError } from '../middlewares/error';

const router = Router();
const controller = new AdminController();

router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL));

// ─── User Management ───
router.get('/stats', controller.getDashboardStats);
router.get('/pending-approvals', controller.getPendingApprovals);
router.post('/approve-user', controller.approveUser);
router.get('/users', controller.getUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.post('/users/:id/disable', controller.disableUser);
router.post('/users/:id/enable', controller.enableUser);
router.post('/users/:id/reset-password', controller.resetUserPassword);
router.delete('/users/:id', controller.deleteUser);
router.get('/report', controller.getReport);

// ─── Classroom Management ───
router.get('/classrooms', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const classrooms = await Classroom.find()
      .populate({
        path: 'teachers',
        populate: {
          path: 'user',
          select: 'firstName lastName email',
        },
      })
      .populate({
        path: 'teacher',
        populate: {
          path: 'user',
          select: 'firstName lastName',
        },
      })
      .populate('students')
      .sort({ gradeLevel: 1 })
      .lean();

    const formatted = classrooms.map((c: any) => ({
      ...c,
      id: c._id,
      _count: { students: c.students ? c.students.length : 0 },
    }));

    res.status(200).json({ status: 'success', data: formatted });
  } catch (err) {
    next(err);
  }
});

router.post('/classrooms', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, gradeLevel, division, teacherIds, teacherId } = req.body;
    let resolvedTeacherIds: string[] = [];
    if (Array.isArray(teacherIds)) {
      resolvedTeacherIds = teacherIds;
    } else if (teacherId) {
      resolvedTeacherIds = [teacherId];
    }
    const primaryTeacherId = resolvedTeacherIds[0] || null;

    const classroom = await Classroom.create({ 
      name, 
      gradeLevel: parseInt(gradeLevel), 
      division: division || 'PRIMARY',
      teacherIds: resolvedTeacherIds,
      teacherId: primaryTeacherId
    });
    res.status(201).json({ status: 'success', data: classroom });
  } catch (err) {
    next(err);
  }
});

// ─── School Settings ───
router.get('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = {
      schoolName: 'SreeVismayee The School',
      address: 'Hyderabad, Telangana, India',
      academicYear: '2025-2026',
      board: 'CBSE',
      phone: '+91 40 1234 5678',
      email: 'admin@sreevismayee.edu',
      website: 'www.sreevismayee.edu',
      toggles: {
        attendanceAlerts: true,
        smsNotifications: true,
        emailDigest: false,
        gpsTracking: true,
      },
    };
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ status: 'success', message: 'Settings updated successfully', data: req.body });
  } catch (err) {
    next(err);
  }
});

// ─── Classroom Edit & Delete ───
router.put('/classrooms/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, gradeLevel, division, teacherIds, teacherId } = req.body;
    let resolvedTeacherIds: string[] = [];
    if (Array.isArray(teacherIds)) {
      resolvedTeacherIds = teacherIds;
    } else if (teacherId) {
      resolvedTeacherIds = [teacherId];
    }
    const primaryTeacherId = resolvedTeacherIds[0] || null;

    const classroom = await Classroom.findByIdAndUpdate(
      id,
      {
        name,
        gradeLevel: gradeLevel ? parseInt(gradeLevel) : undefined,
        division,
        teacherIds: resolvedTeacherIds,
        teacherId: primaryTeacherId,
      },
      { new: true }
    )
      .populate({
        path: 'teachers',
        populate: {
          path: 'user',
          select: 'firstName lastName email',
        },
      })
      .populate({
        path: 'teacher',
        populate: {
          path: 'user',
          select: 'firstName lastName',
        },
      })
      .populate('students')
      .lean();

    const formatted = classroom ? {
      ...classroom,
      id: classroom._id,
      _count: { students: classroom.students ? classroom.students.length : 0 },
    } : null;

    res.status(200).json({ status: 'success', data: formatted });
  } catch (err) {
    next(err);
  }
});

router.delete('/classrooms/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Classroom.findByIdAndDelete(id);
    res.status(200).json({ status: 'success', message: 'Classroom deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── Subject Management (full CRUD with Teacher Assignment) ───
router.get('/subjects', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const subjects = await Subject.find()
      .populate({
        path: 'teachers',
        populate: {
          path: 'teacher',
          populate: { path: 'user', select: 'id firstName lastName email' }
        }
      })
      .populate('schedules')
      .sort({ name: 1 })
      .lean();

    const formatted = subjects.map((s: any) => ({
      ...s,
      id: s._id,
      assignedTeachers: (s.teachers || []).map((st: any) => st.teacher).filter(Boolean),
      _count: { 
        teachers: s.teachers ? s.teachers.length : 0, 
        schedules: s.schedules ? s.schedules.length : 0 
      },
    }));

    res.status(200).json({ status: 'success', data: formatted });
  } catch (err) {
    next(err);
  }
});

router.post('/subjects', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, teacherIds } = req.body;
    if (!name || !code) {
      return next(new AppError('Subject name and code are required', 400));
    }

    const existing = await Subject.findOne({ 
      $or: [{ name }, { code: code.toUpperCase() }] 
    });
    if (existing) {
      return next(new AppError('A subject with this name or code already exists', 400));
    }

    const subject = await Subject.create({ 
      name, 
      code: code.toUpperCase() 
    });

    if (Array.isArray(teacherIds) && teacherIds.length > 0) {
      const teacherProfiles = await TeacherProfile.find({
        $or: [{ _id: { $in: teacherIds } }, { userId: { $in: teacherIds } }]
      }).select('_id');

      const resolvedTeacherProfileIds = teacherProfiles.map((tp: any) => tp._id.toString());
      if (resolvedTeacherProfileIds.length > 0) {
        const docs = resolvedTeacherProfileIds.map((tId: string) => ({
          subjectId: subject.id,
          teacherId: tId
        }));
        await SubjectTeacher.insertMany(docs, { ordered: false }).catch(() => {});
      }
    }

    const updatedSubject = await Subject.findById(subject.id)
      .populate({
        path: 'teachers',
        populate: {
          path: 'teacher',
          populate: { path: 'user', select: 'id firstName lastName email' }
        }
      })
      .lean();

    const formatted = {
      ...updatedSubject,
      id: subject.id,
      assignedTeachers: (updatedSubject?.teachers || []).map((st: any) => st.teacher).filter(Boolean),
      _count: { teachers: updatedSubject?.teachers?.length || 0, schedules: 0 }
    };

    res.status(201).json({ status: 'success', data: formatted });
  } catch (err: any) {
    next(err);
  }
});

router.put('/subjects/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, teacherIds } = req.body;

    if (name || code) {
      const existing = await Subject.findOne({
        _id: { $ne: id },
        $or: [
          ...(name ? [{ name }] : []),
          ...(code ? [{ code: code.toUpperCase() }] : []),
        ],
      });
      if (existing) {
        return next(new AppError('A subject with this name or code already exists', 400));
      }
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { 
        name, 
        code: code ? code.toUpperCase() : undefined 
      },
      { new: true }
    );

    if (!subject) return next(new AppError('Subject not found', 404));

    if (Array.isArray(teacherIds)) {
      await SubjectTeacher.deleteMany({ subjectId: id });
      if (teacherIds.length > 0) {
        const teacherProfiles = await TeacherProfile.find({
          $or: [{ _id: { $in: teacherIds } }, { userId: { $in: teacherIds } }]
        }).select('_id');

        const resolvedTeacherProfileIds = teacherProfiles.map((tp: any) => tp._id.toString());
        if (resolvedTeacherProfileIds.length > 0) {
          const docs = resolvedTeacherProfileIds.map((tId: string) => ({
            subjectId: id,
            teacherId: tId
          }));
          await SubjectTeacher.insertMany(docs, { ordered: false }).catch(() => {});
        }
      }
    }

    const populatedSubject = await Subject.findById(id)
      .populate({
        path: 'teachers',
        populate: {
          path: 'teacher',
          populate: { path: 'user', select: 'id firstName lastName email' }
        }
      })
      .populate('schedules')
      .lean();

    const formatted = populatedSubject ? {
      ...populatedSubject,
      id: populatedSubject._id,
      assignedTeachers: (populatedSubject.teachers || []).map((st: any) => st.teacher).filter(Boolean),
      _count: {
        teachers: populatedSubject.teachers ? populatedSubject.teachers.length : 0,
        schedules: populatedSubject.schedules ? populatedSubject.schedules.length : 0
      }
    } : null;

    res.status(200).json({ status: 'success', data: formatted });
  } catch (err: any) {
    next(err);
  }
});

router.delete('/subjects/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Subject.findByIdAndDelete(id);
    await SubjectTeacher.deleteMany({ subjectId: id });
    res.status(200).json({ status: 'success', message: 'Subject deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
