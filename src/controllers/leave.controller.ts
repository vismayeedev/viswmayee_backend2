import { Response, NextFunction } from 'express';
import { LeaveService } from '../services/leave.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { LeaveStatus, LeaveType } from '../models';

const leaveService = new LeaveService();

export class LeaveController {
  async apply(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { leaveType, startDate, endDate, reason, assignedTeacherId, studentProfileId } = req.body;
      const request = await leaveService.applyLeave({
        userId: req.user!.id,
        role: req.user!.role,
        leaveType: leaveType as LeaveType,
        startDate,
        endDate,
        reason,
        assignedTeacherId,
        studentProfileId,
      });
      res.status(201).json({ status: 'success', data: request });
    } catch (err) {
      next(err);
    }
  }

  async getMyLeaves(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const list = await leaveService.getLeavesByUser(req.user!.id);
      res.status(200).json({ status: 'success', data: list });
    } catch (err) {
      next(err);
    }
  }

  async getPending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pending = await leaveService.getPendingLeaves(req.user!.role);
      res.status(200).json({ status: 'success', data: pending });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { requestId, status, rejectionReason } = req.body;
      const updated = await leaveService.updateLeaveStatus(
        requestId,
        req.user!.id,
        req.user!.role,
        status as LeaveStatus,
        rejectionReason
      );
      res.status(200).json({ status: 'success', data: updated });
    } catch (err) {
      next(err);
    }
  }
}
