import { Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AttendanceStatus } from '../models';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async mark(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId, teacherId, date, status, remarks } = req.body;
      const recordedById = req.user!.id;
      const record = await attendanceService.markAttendance({
        studentId,
        teacherId,
        date,
        status: status as AttendanceStatus,
        remarks,
        recordedById,
      });
      res.status(200).json({ status: 'success', data: record });
    } catch (err) {
      next(err);
    }
  }

  async getStudentPercentage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const percentage = await attendanceService.getAttendancePercentage(studentId);
      res.status(200).json({ status: 'success', data: { percentage } });
    } catch (err) {
      next(err);
    }
  }

  async getStudentReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const { startDate, endDate } = req.query;
      const report = await attendanceService.getAttendanceReport(
        studentId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.status(200).json({ status: 'success', data: report });
    } catch (err) {
      next(err);
    }
  }

  async getClassReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { classroomId } = req.params;
      const { date } = req.query;
      const report = await attendanceService.getClassAttendanceReport(
        classroomId,
        (date as string) || new Date().toISOString()
      );
      res.status(200).json({ status: 'success', data: report });
    } catch (err) {
      next(err);
    }
  }

  async getDetailedReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { classroomId, subjectId, date } = req.query;
      if (!classroomId) {
        return res.status(400).json({ status: 'error', message: 'classroomId is required' });
      }
      const report = await attendanceService.getDetailedAttendanceReport(
        classroomId as string,
        subjectId as string | undefined,
        (date as string) || new Date().toISOString()
      );
      return res.status(200).json({ status: 'success', data: report });
    } catch (err) {
      return next(err);
    }
  }

  async getStaffReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;
      const report = await attendanceService.getStaffAttendanceReport(
        (date as string) || new Date().toISOString()
      );
      res.status(200).json({ status: 'success', data: report });
    } catch (err) {
      next(err);
    }
  }
}
