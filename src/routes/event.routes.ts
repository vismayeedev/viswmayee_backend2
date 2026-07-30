import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, Event, TeacherProfile, StudentProfile, ParentProfile, Classroom } from '../models';

const router = Router();

// 1. Get all events (accessible to all authenticated users, filtered by role targeting)
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    let query: any = {};

    if (userRole === Role.TEACHER) {
      const teacherProfile = await TeacherProfile.findOne({ userId });
      if (teacherProfile && teacherProfile.classroomId) {
        const cl = await Classroom.findById(teacherProfile.classroomId);
        const isPrePrimary = cl ? (cl.gradeLevel <= 0 || /nursery|lkg|ukg|preschool|playgroup/i.test(cl.name)) : false;
        const div = isPrePrimary ? 'PRE_PRIMARY' : 'PRIMARY';

        query = {
          $or: [
            { target: 'ALL' },
            { target: 'DIVISION', division: div },
            { target: 'CLASS', classroomId: teacherProfile.classroomId }
          ]
        };
      } else {
        query = { target: 'ALL' };
      }
    } else if (userRole === Role.PARENT) {
      const parentProfile = await ParentProfile.findOne({ userId });
      if (parentProfile) {
        const students = await StudentProfile.find({ parentId: parentProfile._id });
        const classroomIds = students.map(s => s.classroomId).filter(Boolean);
        const classrooms = await Classroom.find({ _id: { $in: classroomIds } });
        
        const divisions = classrooms.map(cl => {
          const isPrePrimary = cl.gradeLevel <= 0 || /nursery|lkg|ukg|preschool|playgroup/i.test(cl.name);
          return isPrePrimary ? 'PRE_PRIMARY' : 'PRIMARY';
        });

        query = {
          $or: [
            { target: 'ALL' },
            { target: 'DIVISION', division: { $in: divisions } },
            { target: 'CLASS', classroomId: { $in: classroomIds } }
          ]
        };
      } else {
        query = { target: 'ALL' };
      }
    } else if (userRole === Role.STUDENT) {
      const studentProfile = await StudentProfile.findOne({ userId });
      if (studentProfile && studentProfile.classroomId) {
        const cl = await Classroom.findById(studentProfile.classroomId);
        const isPrePrimary = cl ? (cl.gradeLevel <= 0 || /nursery|lkg|ukg|preschool|playgroup/i.test(cl.name)) : false;
        const div = isPrePrimary ? 'PRE_PRIMARY' : 'PRIMARY';

        query = {
          $or: [
            { target: 'ALL' },
            { target: 'DIVISION', division: div },
            { target: 'CLASS', classroomId: studentProfile.classroomId }
          ]
        };
      } else {
        query = { target: 'ALL' };
      }
    }

    const events = await Event.find(query).sort({ startDate: 1 });
    res.status(200).json({ status: 'success', data: events });
  } catch (err) {
    next(err);
  }
});

// 2. Create a new event (Admin, Principal, VP only)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { title, description, startDate, endDate, location, target, division, classroomId } = req.body;
      const newEvent = await Event.create({
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        target: target || 'ALL',
        division: target === 'DIVISION' ? division : undefined,
        classroomId: target === 'CLASS' ? classroomId : undefined,
      });

      res.status(201).json({ status: 'success', data: newEvent });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
