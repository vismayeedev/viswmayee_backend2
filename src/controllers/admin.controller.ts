import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Role } from '../models';
import bcrypt from 'bcryptjs';

const adminService = new AdminService();
const userRepository = new UserRepository();

export class AdminController {
  async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, phone, role, profileData, customRoleId } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await userRepository.createUserWithProfile({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        status: 'ACTIVE', // Admin created users are active immediately
        role,
        profileData,
        customRoleId
      } as any, role);
      res.status(201).json({ status: 'success', data: user });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json({ status: 'success', data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getPendingApprovals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pending = await adminService.getPendingUsers();
      res.status(200).json({ status: 'success', data: pending });
    } catch (err) {
      next(err);
    }
  }

  async approveUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, approve } = req.body;
      const result = await adminService.approveUser(userId, approve);
      res.status(200).json({
        status: 'success',
        message: approve ? 'User approved successfully' : 'User registration rejected',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as Role | undefined;
      const users = await userRepository.listUsers(role);
      res.status(200).json({ status: 'success', data: users });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await userRepository.deleteUser(id);
      res.status(200).json({ status: 'success', message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, status } = req.body;
      const updated = await userRepository.updateUser(id, { firstName, lastName, phone, status });
      res.status(200).json({ status: 'success', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await adminService.getSchoolReport();
      res.status(200).json({ status: 'success', data: report });
    } catch (err) {
      next(err);
    }
  }
}

