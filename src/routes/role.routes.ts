import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middlewares/auth';
import { Role, CustomRole, Permission } from '../models';
import { AppError } from '../middlewares/error';

const router = Router();

router.use(authenticateJWT);
router.use(authorizeRoles(Role.ADMIN));

const DEFAULT_SYSTEM_ROLES = [
  { name: 'Admin', description: 'System Administrator with full permissions across all modules' },
  { name: 'Principal', description: 'School Principal with high-level supervisory & approval access' },
  { name: 'VP', description: 'Centre Head with operational supervisory & approval access' },
  { name: 'Teacher', description: 'Teaching Faculty with attendance, grading, & homework management access' },
  { name: 'Staff', description: 'School Staff & Transport Operators' },
  { name: 'Parent', description: 'Parent / Guardian with student tracking & fee access' },
  { name: 'Student', description: 'Student with personal schedule & academic records access' },
];

const FEATURES_LIST = [
  'View Child',
  'Attendance',
  'Leave Request',
  'Leave Approval',
  'Events',
  'User Management',
  'Role Management',
];

// Helper function to escape regex characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 1. Get all roles and permissions (auto-seeds system roles if missing)
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Ensure all default system roles exist in CustomRole collection
    for (const sysRole of DEFAULT_SYSTEM_ROLES) {
      const exists = await CustomRole.findOne({ 
        name: { $regex: new RegExp(`^${escapeRegExp(sysRole.name)}$`, 'i') } 
      });
      if (!exists) {
        const created = await CustomRole.create(sysRole);
        await Permission.insertMany(
          FEATURES_LIST.map((f) => ({
            roleId: created.id,
            feature: f,
            accessType: sysRole.name === 'Admin' ? 'Full' : 'cross',
          })),
          { ordered: false }
        ).catch(() => {});
      }
    }

    const roles = await CustomRole.find()
      .populate('permissions')
      .sort({ createdAt: 1 });

    res.status(200).json({ status: 'success', data: roles });
  } catch (err) {
    next(err);
  }
});

// 2. Create a new custom role with strict duplicate validation
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return next(new AppError('Role name is required', 400));
    }

    const trimmedName = name.trim();

    // Check case-insensitive duplicate against CustomRole collection
    const existing = await CustomRole.findOne({
      name: { $regex: new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i') }
    });

    if (existing) {
      return next(new AppError(`A role with the name "${trimmedName}" already exists. Duplicate role names are not allowed.`, 400));
    }

    const newRole = await CustomRole.create({ name: trimmedName, description: description ? description.trim() : '' });

    // Seed default permissions for the new custom role
    await Permission.insertMany(
      FEATURES_LIST.map((f) => ({
        roleId: newRole.id,
        feature: f,
        accessType: 'cross',
      })),
      { ordered: false }
    ).catch(() => {});

    const createdRole = await CustomRole.findById(newRole.id).populate('permissions');

    res.status(201).json({ status: 'success', data: createdRole });
  } catch (err) {
    next(err);
  }
});

// 3. Edit custom role details with duplicate validation
router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return next(new AppError('Role name is required', 400));
    }

    const trimmedName = name.trim();
    const systemRoleNames = ['Admin', 'Principal', 'VP', 'Teacher', 'Staff', 'Parent', 'Student'];
    const current = await CustomRole.findById(id);
    if (!current) {
      return next(new AppError('Role not found', 404));
    }

    if (systemRoleNames.map(s => s.toLowerCase()).includes(current.name.toLowerCase()) && trimmedName.toLowerCase() !== current.name.toLowerCase()) {
      return next(new AppError('Cannot rename default system roles', 400));
    }

    // Check if another role already uses this name (case-insensitive)
    const duplicate = await CustomRole.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapeRegExp(trimmedName)}$`, 'i') }
    });

    if (duplicate) {
      return next(new AppError(`A role with the name "${trimmedName}" already exists. Duplicate role names are not allowed.`, 400));
    }

    const updated = await CustomRole.findByIdAndUpdate(
      id,
      { name: trimmedName, description: description ? description.trim() : '' },
      { new: true }
    ).populate('permissions');

    res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    next(err);
  }
});

// 4. Delete custom role
router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const current = await CustomRole.findById(id);
    if (!current) {
      return next(new AppError('Role not found', 404));
    }

    const systemRoleNames = ['admin', 'principal', 'vp', 'teacher', 'staff', 'parent', 'student'];
    if (systemRoleNames.includes(current.name.toLowerCase())) {
      return next(new AppError('Cannot delete default system roles', 400));
    }

    await CustomRole.findByIdAndDelete(id);
    await Permission.deleteMany({ roleId: id });

    res.status(200).json({ status: 'success', message: 'Role deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// 5. Update/Save permissions matrix
router.post('/permissions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return next(new AppError('Invalid request format. Expected permissions array', 400));
    }

    const bulkOps = permissions.map((p) => ({
      updateOne: {
        filter: { roleId: p.roleId, feature: p.feature },
        update: { $set: { accessType: p.accessType } },
        upsert: true,
      },
    }));

    await Permission.bulkWrite(bulkOps);

    res.status(200).json({ status: 'success', message: 'Permissions matrix updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;

