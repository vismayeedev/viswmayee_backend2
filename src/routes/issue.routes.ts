import { Router, Request, Response, NextFunction } from 'express';
import { Role, Issue } from '../models';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);

// ─── POST /issues/raise  (Parent or Teacher raises an issue) ─────────────────
router.post(
  '/raise',
  authorizeRoles(Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, description, category, priority, studentId } = req.body;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      if (!title || !description || !category) {
        return next(new AppError('Title, description and category are required', 400));
      }

      const issue = await Issue.create({
        title,
        description,
        category,
        priority: priority || 'MEDIUM',
        raisedById: userId,
        raisedByRole: userRole,
        studentId: studentId || null,
        status: 'OPEN',
        resolvedById: null,
        resolvedAt: null,
        resolution: null,
      });

      res.status(201).json({ success: true, data: issue, message: 'Issue raised successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /issues/my-issues  (Get issues raised by the logged-in user) ─────────
router.get('/my-issues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;

    const issues = await Issue.find({ raisedById: userId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: issues });
  } catch (err) {
    next(err);
  }
});

// ─── GET /issues/all  (Admin/Principal/VP views all issues) ──────────────────
router.get(
  '/all',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, category, priority } = req.query;

      const query: any = {};
      if (status) query.status = status;
      if (category) query.category = category;
      if (priority) query.priority = priority;

      const issues = await Issue.find(query)
        .sort({ createdAt: -1 });

      res.json({ success: true, data: issues });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /issues/:id/status  (Admin/Principal/VP updates status) ────────────
router.patch(
  '/:id/status',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, resolution } = req.body;
      const userId = (req as any).user?.id;

      if (!status) return next(new AppError('Status is required', 400));

      const updateData: any = {
        status,
      };

      if (status === 'RESOLVED' || status === 'CLOSED') {
        updateData.resolvedById = userId;
        updateData.resolvedAt = new Date();
        if (resolution) updateData.resolution = resolution;
      }

      const issue = await Issue.findByIdAndUpdate(id, updateData, { new: true });

      res.json({ success: true, data: issue, message: `Issue marked as ${status}` });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /issues/:id  (Owner can delete their own OPEN issue) ──────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const issue = await Issue.findById(id);
    if (!issue) return next(new AppError('Issue not found', 404));

    const isOwner = issue.raisedById === userId;
    const isAdmin = [Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL].includes(userRole);

    if (!isOwner && !isAdmin) {
      return next(new AppError('You are not authorized to delete this issue', 403));
    }

    await Issue.findByIdAndDelete(id);
    res.json({ success: true, message: 'Issue deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
