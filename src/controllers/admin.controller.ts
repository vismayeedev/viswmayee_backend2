import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Role, User } from '../models';
import { AppError } from '../middlewares/error';
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
      const { firstName, lastName, phone, status, email, password, newPassword } = req.body;

      // If email is being updated, check it's not already taken by another user
      if (email) {
        const existing = await User.findOne({ email, _id: { $ne: id } });
        if (existing) {
          return next(new AppError('Email is already in use by another account', 400));
        }
      }

      const updateData: any = {
        firstName,
        lastName,
        phone,
        status,
        ...(email ? { email } : {}),
      };

      const rawPassword = newPassword || password;
      if (rawPassword) {
        if (rawPassword.length < 6) {
          return next(new AppError('Password must be at least 6 characters long', 400));
        }
        updateData.password = await bcrypt.hash(rawPassword, 10);
        updateData.resetToken = null;
        updateData.resetTokenExpiry = null;
        await userRepository.deleteUserRefreshTokens(id);
      }

      if (status === 'INACTIVE') {
        await userRepository.deleteUserRefreshTokens(id);
      }

      const updated = await userRepository.updateUser(id, updateData);
      res.status(200).json({ status: 'success', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async disableUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await userRepository.updateUser(id, { status: 'INACTIVE' });
      if (!updated) {
        return next(new AppError('User not found', 404));
      }
      await userRepository.deleteUserRefreshTokens(id);
      res.status(200).json({ status: 'success', message: 'User account disabled (tenure completed).', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async enableUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await userRepository.updateUser(id, { status: 'ACTIVE' });
      if (!updated) {
        return next(new AppError('User not found', 404));
      }
      res.status(200).json({ status: 'success', message: 'User account activated successfully.', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async resetUserPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { newPassword, password } = req.body;
      const targetPassword = newPassword || password;

      if (!targetPassword || targetPassword.length < 6) {
        return next(new AppError('Password must be at least 6 characters long', 400));
      }

      const hashedPassword = await bcrypt.hash(targetPassword, 10);
      const updated = await userRepository.updateUser(id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      if (!updated) {
        return next(new AppError('User not found', 404));
      }

      await userRepository.deleteUserRefreshTokens(id);
      res.status(200).json({ status: 'success', message: 'User password reset successfully' });
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

