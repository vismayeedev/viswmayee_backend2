import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validation';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validation/auth';

const router = Router();
const controller = new AuthController();

router.post('/register', validateRequest(registerSchema), controller.register);
router.post('/login', validateRequest(loginSchema), controller.login);
router.post('/refresh', validateRequest(refreshSchema), controller.refresh);
router.post('/logout', validateRequest(refreshSchema), controller.logout);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), controller.resetPassword);

// Protected routes
router.post('/change-password', authenticateJWT, validateRequest(changePasswordSchema), controller.changePassword);
router.get('/me', authenticateJWT, controller.getCurrentUser);

export default router;
