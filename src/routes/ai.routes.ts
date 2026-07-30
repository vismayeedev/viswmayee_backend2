import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();
const controller = new AIController();

router.use(authenticateJWT);

router.get('/session', controller.getSession);
router.post('/ask', controller.ask);

export default router;
