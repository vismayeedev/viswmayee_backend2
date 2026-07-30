import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../models';

const router = Router();
const controller = new LeaveController();

router.use(authenticateJWT);

router.post('/apply', controller.apply);
router.get('/my-leaves', controller.getMyLeaves);

// View pending requests for approval
router.get(
  '/pending', 
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.TEACHER), 
  controller.getPending
);

// Approve or reject
router.post(
  '/status',
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.TEACHER),
  controller.updateStatus
);

export default router;
