import { Router, Response, NextFunction } from 'express';
import { BusController } from '../controllers/bus.controller';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, StaffProfile, BusRoute } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();
const controller = new BusController();

router.use(authenticateJWT);

// Public to all authenticated users (parents, students, teachers need to see routes)
router.get('/routes', controller.getRoutes);
router.get('/routes/:id', controller.getRouteById);

// Driver's own route with students and today's boarding
router.get(
  '/my-route',
  authorizeRoles(Role.STAFF, Role.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const staff = await StaffProfile.findOne({ userId });
      if (!staff) return next(new AppError('Staff profile not found', 404));

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const route = await BusRoute.findOne({ driverId: staff.id })
        .populate({
          path: 'students',
          populate: [
            { path: 'user', select: 'firstName lastName' },
            {
              path: 'busAttendance',
              match: { date: { $gte: todayStart, $lte: todayEnd } },
              options: { sort: { recordedAt: -1 }, limit: 1 },
            },
          ],
        })
        .populate({
          path: 'driver',
          populate: {
            path: 'user',
            select: 'firstName lastName phone',
          },
        });

      if (!route) return next(new AppError('No route assigned to this driver', 404));

      res.status(200).json({ status: 'success', data: route });
    } catch (err) {
      next(err);
    }
  }
);

// Driver / Staff updates GPS
router.post(
  '/location',
  authorizeRoles(Role.ADMIN, Role.STAFF),
  controller.updateLocation
);

// Driver records boarding attendance
router.post(
  '/boarding',
  authorizeRoles(Role.ADMIN, Role.STAFF),
  controller.recordBoarding
);

// Get route boarding history
router.get('/routes/:routeId/boarding-history', controller.getBoardingHistory);

// Admin management of routes and assignments
router.post('/routes', authorizeRoles(Role.ADMIN), controller.createRoute);
router.put('/routes/:id', authorizeRoles(Role.ADMIN), controller.updateRoute);
router.delete('/routes/:id', authorizeRoles(Role.ADMIN), controller.deleteRoute);
router.post('/assign-student', authorizeRoles(Role.ADMIN), controller.assignStudent);
router.post('/remove-student', authorizeRoles(Role.ADMIN), controller.removeStudent);
router.get('/drivers', authorizeRoles(Role.ADMIN), controller.getDrivers);

export default router;
