import { Response, NextFunction } from 'express';
import { BusService } from '../services/bus.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AttendanceStatus, StaffProfile } from '../models';

const busService = new BusService();

export class BusController {
  async getRoutes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const routes = await busService.getRoutes();
      res.status(200).json({ status: 'success', data: routes });
    } catch (err) {
      next(err);
    }
  }

  async getRouteById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const route = await busService.getRouteById(id);
      res.status(200).json({ status: 'success', data: route });
    } catch (err) {
      next(err);
    }
  }

  async updateLocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { routeId, latitude, longitude, etaMinutes } = req.body;
      const updated = await busService.updateLiveLocation(routeId, latitude, longitude, etaMinutes);
      res.status(200).json({ status: 'success', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async recordBoarding(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { busRouteId, studentId, type, status } = req.body;
      const record = await busService.recordBoardingAttendance({
        busRouteId,
        studentId,
        type: type as 'PICKUP' | 'DROP',
        status: status as AttendanceStatus,
      });
      res.status(200).json({ status: 'success', data: record });
    } catch (err) {
      next(err);
    }
  }

  async getBoardingHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { routeId } = req.params;
      const { date } = req.query;
      const history = await busService.getRouteBoardingHistory(
        routeId,
        (date as string) || new Date().toISOString()
      );
      res.status(200).json({ status: 'success', data: history });
    } catch (err) {
      next(err);
    }
  }

  async createRoute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const route = await busService.createRoute(req.body);
      res.status(201).json({ status: 'success', data: route });
    } catch (err) {
      next(err);
    }
  }

  async updateRoute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const route = await busService.updateRoute(id, req.body);
      res.status(200).json({ status: 'success', data: route });
    } catch (err) {
      next(err);
    }
  }

  async deleteRoute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await busService.deleteRoute(id);
      res.status(204).json({ status: 'success', data: null });
    } catch (err) {
      next(err);
    }
  }

  async assignStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId, routeId } = req.body;
      await busService.assignStudentToRoute(studentId, routeId);
      res.status(200).json({ status: 'success', data: null });
    } catch (err) {
      next(err);
    }
  }

  async removeStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.body;
      await busService.removeStudentFromRoute(studentId);
      res.status(200).json({ status: 'success', data: null });
    } catch (err) {
      next(err);
    }
  }

  async getDrivers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const drivers = await StaffProfile.find({ roleType: 'DRIVER' }).populate('user', 'firstName lastName phone email');
      res.status(200).json({ status: 'success', data: drivers });
    } catch (err) {
      next(err);
    }
  }
}
