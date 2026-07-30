import { 
  User, 
  RefreshToken, 
  AdminProfile, 
  PrincipalProfile, 
  VicePrincipalProfile, 
  TeacherProfile, 
  StaffProfile, 
  ParentProfile, 
  StudentProfile, 
  Classroom, 
  CustomRole, 
  Role 
} from '../models';

export class UserRepository {
  async findByEmail(email: string) {
    return User.findOne({ email })
      .populate('adminProfile')
      .populate('principalProfile')
      .populate('vpProfile')
      .populate('teacherProfile')
      .populate('staffProfile')
      .populate('parentProfile')
      .populate('studentProfile')
      .populate('customRole');
  }

  async findById(id: string) {
    return User.findById(id)
      .populate('adminProfile')
      .populate('principalProfile')
      .populate('vpProfile')
      .populate('teacherProfile')
      .populate('staffProfile')
      .populate('parentProfile')
      .populate('studentProfile')
      .populate('customRole');
  }

  async createUser(data: any) {
    return User.create(data);
  }

  async createUserWithProfile(userData: any, role: Role) {
    const systemRoleNameMap: Record<string, string> = {
      ADMIN: 'Admin',
      PRINCIPAL: 'Principal',
      VICE_PRINCIPAL: 'VP',
      TEACHER: 'Teacher',
      STAFF: 'Staff',
      PARENT: 'Parent',
      STUDENT: 'Student'
    };
    
    let customRoleId = userData.customRoleId;
    if (!customRoleId) {
      const mappedName = systemRoleNameMap[role];
      if (mappedName) {
        const dbRole = await CustomRole.findOne({ name: mappedName });
        if (dbRole) {
          customRoleId = dbRole.id;
        }
      }
    }

    const user = await User.create({
      email: userData.email,
      password: userData.password,
      role: role,
      status: userData.status || 'PENDING_APPROVAL',
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      profileImage: userData.profileImage,
      customRoleId: customRoleId,
    });

    // Create profile based on Role
    if (role === Role.ADMIN) {
      await AdminProfile.create({ userId: user.id });
    } else if (role === Role.PRINCIPAL) {
      await PrincipalProfile.create({ userId: user.id });
    } else if (role === Role.VICE_PRINCIPAL) {
      await VicePrincipalProfile.create({ userId: user.id });
    } else if (role === Role.TEACHER) {
      await TeacherProfile.create({
        userId: user.id,
        employeeId: userData.profileData?.employeeId || `TCH-${Date.now()}`,
        qualification: userData.profileData?.qualification || 'Not Specified',
        specialization: userData.profileData?.specialization || 'Not Specified',
      });
    } else if (role === Role.STAFF) {
      await StaffProfile.create({
        userId: user.id,
        employeeId: userData.profileData?.employeeId || `STF-${Date.now()}`,
        roleType: userData.profileData?.roleType || 'DRIVER',
      });
    } else if (role === Role.PARENT) {
      await ParentProfile.create({
        userId: user.id,
        profession: userData.profileData?.profession || '',
        address: userData.profileData?.address || 'Not Specified',
      });
    } else if (role === Role.STUDENT) {
      // Find or create default classroom
      let classroomId = userData.profileData?.classroomId;
      if (!classroomId) {
        const defaultClass = await Classroom.findOne();
        if (defaultClass) {
          classroomId = defaultClass.id;
        } else {
          const newClass = await Classroom.create({
            name: 'Default Grade 1',
            gradeLevel: 1,
          });
          classroomId = newClass.id;
        }
      }
      // Find or create parent if not exist
      let parentId = userData.profileData?.parentId;
      if (!parentId) {
        // Find first parent or create default mock
        const defaultParent = await ParentProfile.findOne();
        if (defaultParent) {
          parentId = defaultParent.id;
        } else {
          // create mock parent user
          const mockParentUser = await User.create({
            email: `parent-${Date.now()}@viswaschool.com`,
            password: 'hashedpassword',
            role: Role.PARENT,
            firstName: 'Default',
            lastName: 'Parent',
            status: 'ACTIVE',
          });
          const mockParent = await ParentProfile.create({
            userId: mockParentUser.id,
            address: 'Not Specified',
          });
          parentId = mockParent.id;
        }
      }
      await StudentProfile.create({
        userId: user.id,
        admissionNo: userData.profileData?.admissionNo || `ADM-${Date.now()}`,
        dob: userData.profileData?.dob ? new Date(userData.profileData.dob) : new Date(),
        gender: userData.profileData?.gender || 'MALE',
        classroomId: classroomId,
        parentId: parentId,
      });
    }

    return User.findById(user.id)
      .populate('adminProfile')
      .populate('principalProfile')
      .populate('vpProfile')
      .populate('teacherProfile')
      .populate('staffProfile')
      .populate('parentProfile')
      .populate('studentProfile');
  }

  async updateUser(id: string, data: any) {
    return User.findByIdAndUpdate(id, data, { new: true });
  }

  async listUsers(role?: Role) {
    const query = role ? { role } : {};
    return User.find(query)
      .populate('adminProfile')
      .populate('principalProfile')
      .populate('vpProfile')
      .populate('teacherProfile')
      .populate('staffProfile')
      .populate('parentProfile')
      .populate({
        path: 'studentProfile',
        populate: [
          { path: 'classroom' },
          {
            path: 'parent',
            populate: { path: 'user' }
          }
        ]
      })
      .populate('customRole');
  }

  async deleteUser(id: string) {
    return User.findByIdAndDelete(id);
  }

  // Token management
  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    return RefreshToken.create({
      token,
      userId,
      expiresAt,
    });
  }

  async findRefreshToken(token: string) {
    return RefreshToken.findOne({ token }).populate('user');
  }

  async deleteRefreshToken(token: string) {
    return RefreshToken.findOneAndDelete({ token }).catch(() => null);
  }

  async deleteUserRefreshTokens(userId: string) {
    return RefreshToken.deleteMany({ userId });
  }
}

