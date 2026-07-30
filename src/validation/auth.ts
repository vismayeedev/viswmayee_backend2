import { z } from 'zod';
import { Role } from '../models';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  profileData: z.object({
    employeeId: z.string().optional(),
    qualification: z.string().optional(),
    specialization: z.string().optional(),
    roleType: z.string().optional(), // for Staff
    profession: z.string().optional(), // for Parent
    address: z.string().optional(), // for Parent
    admissionNo: z.string().optional(), // for Student
    dob: z.string().optional(), // for Student
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(), // for Student
    classroomId: z.string().optional(), // for Student
    parentId: z.string().optional(), // for Student
  }).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});
