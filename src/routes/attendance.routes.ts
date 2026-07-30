import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth';
import { Role } from '../models';

const router = Router();
const controller = new AttendanceController();

router.use(authenticateJWT);

// Marking is allowed for Admin, VP, Principal, Teacher and Staff (for bus pickup)
router.post(
  '/mark', 
  authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.TEACHER, Role.STAFF),
  controller.mark
);

// Reports query
router.get('/report', authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL), controller.getDetailedReport);
router.get('/staff-report', authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL), controller.getStaffReport);
router.get('/student/:studentId/percentage', controller.getStudentPercentage);
router.get('/student/:studentId/report', controller.getStudentReport);
router.get('/class/:classroomId/report', authorizeRoles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.TEACHER), controller.getClassReport);

export default router;
