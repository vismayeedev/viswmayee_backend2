import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, GradeReport } from '../models';

const router = Router();

router.use(authenticateJWT);

// 1. Post a new grade report card (Teacher, Admin, VP, Principal only)
router.post(
  '/',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.TEACHER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId, term, academicYear, subject, grade, score, remarks } = req.body;
      const report = await GradeReport.create({
        studentId,
        term,
        academicYear,
        subject,
        grade,
        score: parseFloat(score),
        remarks,
      });

      res.status(201).json({ status: 'success', data: report });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Retrieve student grades (Teacher, Admin, VP, Principal only)
router.get(
  '/student/:studentId',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.TEACHER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params;
      const reports = await GradeReport.find({ studentId })
        .sort({ publishedAt: -1 });

      res.status(200).json({ status: 'success', data: reports });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
