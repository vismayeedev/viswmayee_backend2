import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '../models';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../middlewares/error';
import { logger } from '../utils/logger';

const userRepository = new UserRepository();

const JWT_SECRET = process.env.JWT_SECRET || 'viswaschool-super-secret-jwt-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'viswaschool-super-secret-refresh-jwt-key-2026';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

export class AuthService {
  private generateAccessToken(user: { id: string; email: string; role: Role }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY as any }
    );
  }

  private generateRefreshToken(user: { id: string; email: string; role: Role }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY as any }
    );
  }

  async register(data: any, role: Role) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await userRepository.createUserWithProfile({
      ...data,
      password: hashedPassword,
      status: 'PENDING_APPROVAL', // default registration requires VP/Admin approval
    }, role);

    if (!user) {
      throw new AppError('Could not register user', 500);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status === 'INACTIVE') {
      throw new AppError('Your account has been deactivated. Contact Admin.', 403);
    }
    if (user.status === 'PENDING_APPROVAL') {
      throw new AppError('Your account approval is pending by school administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Save refresh token to db
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await userRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
      },
    };
  }

  async refresh(token: string) {
    const storedToken = await userRepository.findRefreshToken(token);
    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (storedToken.expiresAt < new Date()) {
      await userRepository.deleteRefreshToken(token);
      throw new AppError('Refresh token expired', 401);
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
      await userRepository.deleteRefreshToken(token);
      throw new AppError('Invalid refresh token signature', 401);
    }

    const user = await userRepository.findById(payload.id);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('User not found or inactive', 401);
    }

    // Rotate refresh token
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    await userRepository.deleteRefreshToken(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await userRepository.saveRefreshToken(user.id, newRefreshToken, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string) {
    await userRepository.deleteRefreshToken(token);
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Return success even if email not found for security purposes
      return { message: 'If email exists, a reset link will be sent.' };
    }

    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    await userRepository.updateUser(user.id, {
      resetToken,
      resetTokenExpiry: resetExpiry,
    });

    logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);
    // Here you would send the email via a mailer service. We mock it in logs.
    return {
      message: 'Reset token generated (mock). Check console/logs for reset link.',
      resetToken, // for testing purposes
    };
  }

  async resetPassword(token: string, newPass: string) {
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const user = await userRepository.findById(payload.id);
    if (!user || user.resetToken !== token || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await userRepository.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    // Delete all refresh tokens to force re-login on all devices
    await userRepository.deleteUserRefreshTokens(user.id);

    return { success: true };
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(oldPass, user.password);
    if (!isMatch) {
      throw new AppError('Incorrect old password', 400);
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await userRepository.updateUser(user.id, {
      password: hashedPassword,
    });

    await userRepository.deleteUserRefreshTokens(userId);
    return { success: true };
  }
}
