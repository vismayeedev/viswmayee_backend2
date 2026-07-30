import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, NotificationRecipient, Notification, StudentProfile, TeacherProfile, Classroom } from '../models';

const router = Router();

router.use(authenticateJWT);

// 1. Get user's own notifications
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notifications = await NotificationRecipient.find({ recipientId: userId })
      .populate({
        path: 'notification',
        populate: {
          path: 'sender',
          select: 'firstName lastName',
        },
      })
      .limit(50);

    // Sort programmatically by notification's createdAt desc
    notifications.sort((a: any, b: any) => {
      const dateA = a.notification ? new Date(a.notification.createdAt).getTime() : 0;
      const dateB = b.notification ? new Date(b.notification.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      status: 'success',
      data: { notifications, unreadCount },
    });
  } catch (err) {
    next(err);
  }
});

// 1b. Get birthday alerts for tomorrow (Principal, VP, and Teacher)
router.get('/birthday-alerts', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    // Calculate tomorrow's month and dayOfMonth
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowMonth = tomorrow.getMonth() + 1; // 1-12
    const tomorrowDay = tomorrow.getDate(); // 1-31

    const dobQuery = {
      $expr: {
        $and: [
          { $eq: [{ $month: '$dob' }, tomorrowMonth] },
          { $eq: [{ $dayOfMonth: '$dob' }, tomorrowDay] }
        ]
      }
    };

    let students: any[] = [];

    if (userRole === Role.ADMIN || userRole === Role.PRINCIPAL || userRole === Role.VICE_PRINCIPAL) {
      students = await StudentProfile.find(dobQuery)
        .populate({
          path: 'user',
          select: 'firstName lastName email',
        })
        .populate({
          path: 'classroom',
          select: 'name gradeLevel',
        })
        .lean();
    } else if (userRole === Role.TEACHER) {
      const teacher = await TeacherProfile.findOne({ userId });
      if (!teacher) {
        res.status(200).json({ status: 'success', data: [] });
        return;
      }

      // Find all classrooms assigned to this teacher
      const classrooms = await Classroom.find({ teacherIds: teacher._id });
      const classroomIds = classrooms.map(c => c._id);

      students = await StudentProfile.find({
        classroomId: { $in: classroomIds },
        ...dobQuery
      })
        .populate({
          path: 'user',
          select: 'firstName lastName email',
        })
        .populate({
          path: 'classroom',
          select: 'name gradeLevel',
        })
        .lean();
    }

    const formatted = students.map((s: any) => ({
      id: s._id,
      firstName: s.user?.firstName || 'Student',
      lastName: s.user?.lastName || '',
      email: s.user?.email || '',
      classroomName: s.classroom?.name || 'Class N/A',
      gradeLevel: s.classroom?.gradeLevel,
      dob: s.dob
    }));

    res.status(200).json({ status: 'success', data: formatted });
  } catch (err) {
    next(err);
  }
});

// 2. Mark specific notification as read
router.put('/:id/read', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const updated = await NotificationRecipient.updateMany(
      { _id: id, recipientId: userId },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// 3. Mark all notifications as read
router.put('/read-all', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await NotificationRecipient.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// 4. Send a notification (Admin/Principal only)
router.post(
  '/send',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { title, message, channel, recipientIds } = req.body;
      const senderId = req.user!.id;

      const notification = await Notification.create({
        title,
        message,
        channel: channel || 'IN_APP',
        senderId,
      });

      if (Array.isArray(recipientIds) && recipientIds.length > 0) {
        await NotificationRecipient.insertMany(
          (recipientIds as string[]).map((recipientId) => ({
            notificationId: notification.id,
            recipientId,
          }))
        );
      }

      res.status(201).json({ status: 'success', data: notification });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
