import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, User } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);

// ─── ADMISSION APPLICATIONS ───
// Note: Admissions are modelled as Users with STUDENT role + PENDING_APPROVAL status

// 1. Get all admission applications
router.get(
  '/',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      const query: any = { role: Role.STUDENT };
      
      if (status) {
        query.status = status;
      }

      const applications = await User.find(query)
        .populate({
          path: 'studentProfile',
          populate: { path: 'classroom' },
        })
        .select('firstName lastName email phone status createdAt')
        .sort({ createdAt: -1 });

      res.status(200).json({ status: 'success', data: applications });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Approve or reject an admission application
router.put(
  '/:userId/status',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { approve } = req.body;

      const user = await User.findById(userId);
      if (!user) return next(new AppError('User not found', 404));

      const updated = await User.findByIdAndUpdate(
        userId,
        { status: approve ? 'ACTIVE' : 'INACTIVE' },
        { new: true }
      );

      res.status(200).json({
        status: 'success',
        message: approve ? 'Admission approved' : 'Admission rejected',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Get admission stats
router.get(
  '/stats',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const [total, pending, approved, rejected] = await Promise.all([
        User.countDocuments({ role: Role.STUDENT }),
        User.countDocuments({ role: Role.STUDENT, status: 'PENDING_APPROVAL' }),
        User.countDocuments({ role: Role.STUDENT, status: 'ACTIVE' }),
        User.countDocuments({ role: Role.STUDENT, status: 'INACTIVE' }),
      ]);

      res.status(200).json({
        status: 'success',
        data: { total, pending, approved, rejected },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
