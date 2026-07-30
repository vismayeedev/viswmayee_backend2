import { Response, NextFunction } from 'express';
import { AIService } from '../services/ai.service';
import { AuthenticatedRequest } from '../middlewares/auth';

const aiService = new AIService();

export class AIController {
  async getSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.query;
      const session = await aiService.getOrCreateSession(
        req.user!.id,
        sessionId as string | undefined
      );
      res.status(200).json({ status: 'success', data: session });
    } catch (err) {
      next(err);
    }
  }

  async ask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId, message } = req.body;
      const responseMessage = await aiService.processMessage(
        req.user!.id,
        req.user!.role,
        sessionId,
        message
      );
      res.status(200).json({ status: 'success', data: responseMessage });
    } catch (err) {
      next(err);
    }
  }
}
