import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

// Fix for Node.js SRV lookup issues on Windows
dns.setDefaultResultOrder('ipv4first');
import { 
  CustomRole, 
  Permission, 
  User, 
  AdminProfile, 
  PrincipalProfile, 
  VicePrincipalProfile, 
  TeacherProfile, 
  StaffProfile, 
  ParentProfile, 
  StudentProfile, 
  Classroom, 
  Subject, 
  BusRoute, 
  Schedule, 
  Role, 
  UserStatus, 
  Gender 
} from '../src/models';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.DATABASE_URL || "mongodb://durgaraokumili300_db_user:1rbPoPKWDgsmX2Hw@ac-gefnk3g-shard-00-00.9ruzudz.mongodb.net:27017,ac-gefnk3g-shard-00-01.9ruzudz.mongodb.net:27017,ac-gefnk3g-shard-00-02.9ruzudz.mongodb.net:27017/viswaschool?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function main() {
  console.log('Connecting to MongoDB Atlas for seeding...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected! Resetting database collections...');

  // Drop the database for a clean seed
  try {
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped successfully ✓');
  } catch (err) {
    console.log('Database drop failed or not needed:', err);
  }

  console.log('Seeding custom roles...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create CustomRoles
  const roleNames = ['Admin', 'Principal', 'VP', 'Teacher', 'Staff', 'Parent', 'Student'];
  const createdRoles: Record<string, any> = {};

  for (const name of roleNames) {
    createdRoles[name] = await CustomRole.create({
      name,
      description: `${name} System Role`,
    });
  }
  console.log('Custom roles created ✓');

  // 2. Seed initial permissions for all custom roles
  const initialPermissions = [
    // View Child
    { feature: 'View Child', role: 'Parent', access: 'checked' },
    { feature: 'View Child', role: 'Admin', access: 'checked' },
    // Attendance
    { feature: 'Attendance', role: 'Parent', access: 'View' },
    { feature: 'Attendance', role: 'Teacher', access: 'Manage' },
    { feature: 'Attendance', role: 'Staff', access: 'Transport' },
    { feature: 'Attendance', role: 'VP', access: 'Monitor' },
    { feature: 'Attendance', role: 'Principal', access: 'View' },
    { feature: 'Attendance', role: 'Admin', access: 'Full' },
    // Leave Request
    { feature: 'Leave Request', role: 'Parent', access: 'checked' },
    { feature: 'Leave Request', role: 'Teacher', access: 'checked' },
    { feature: 'Leave Request', role: 'Staff', access: 'checked' },
    { feature: 'Leave Request', role: 'VP', access: 'checked' },
    { feature: 'Leave Request', role: 'Principal', access: 'checked' },
    { feature: 'Leave Request', role: 'Admin', access: 'Full' },
    // Leave Approval
    { feature: 'Leave Approval', role: 'VP', access: 'checked' },
    { feature: 'Leave Approval', role: 'Principal', access: 'checked' },
    { feature: 'Leave Approval', role: 'Admin', access: 'Full' },
    // Events
    { feature: 'Events', role: 'Parent', access: 'View' },
    { feature: 'Events', role: 'Teacher', access: 'Manage' },
    { feature: 'Events', role: 'Staff', access: 'View' },
    { feature: 'Events', role: 'VP', access: 'Approve' },
    { feature: 'Events', role: 'Principal', access: 'Final Approve' },
    { feature: 'Events', role: 'Admin', access: 'Full' },
    // User Management
    { feature: 'User Management', role: 'Admin', access: 'checked' },
    // Role Management
    { feature: 'Role Management', role: 'Admin', access: 'checked' },
  ];

  const permissionsToInsert: any[] = initialPermissions.map((perm) => ({
    roleId: createdRoles[perm.role].id,
    feature: perm.feature,
    accessType: perm.access,
  }));

  await Permission.insertMany(permissionsToInsert);
  console.log('Permissions matrix seeded ✓');

  // 3. Create Admin User
  const admin = await User.create({
    email: 'admin@viswaschool.com',
    password: hashedPassword,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    firstName: 'Albus',
    lastName: 'Dumbledore',
    customRoleId: createdRoles['Admin'].id,
  });
  await AdminProfile.create({ userId: admin.id });
  console.log('Admin user and profile created ✓');

  // 4. Create Principal User
  const principal = await User.create({
    email: 'principal@viswaschool.com',
    password: hashedPassword,
    role: Role.PRINCIPAL,
    status: UserStatus.ACTIVE,
    firstName: 'Anita',
    lastName: 'Rao',
    phone: '9876543210',
    customRoleId: createdRoles['Principal'].id,
  });
  await PrincipalProfile.create({ userId: principal.id });
  console.log('Principal user and profile created ✓');

  // 5. Create VP User
  const vp = await User.create({
    email: 'vp@viswaschool.com',
    password: hashedPassword,
    role: Role.VICE_PRINCIPAL,
    status: UserStatus.ACTIVE,
    firstName: 'Vikram',
    lastName: 'Sen',
    phone: '9876543211',
    customRoleId: createdRoles['VP'].id,
  });
  await VicePrincipalProfile.create({ userId: vp.id });
  console.log('VP user and profile created ✓');

  // 6. Create Classrooms
  const classroom = await Classroom.create({
    name: 'Grade 6',
    gradeLevel: 6,
    division: 'PRIMARY',
  });
  const nurseryClassroom = await Classroom.create({
    name: 'Nursery A',
    gradeLevel: 0,
    division: 'PRE_PRIMARY',
  });
  console.log('Classrooms created ✓');

  // 7. Create Subjects
  const langSubject = await Subject.create({
    name: 'Language Arts',
    code: 'LANG',
  });
  const mathSubject = await Subject.create({
    name: 'Math & Shapes',
    code: 'MATH',
  });
  const artsSubject = await Subject.create({
    name: 'Creative Arts',
    code: 'ARTS',
  });
  console.log('Subjects created ✓');

  // 8. Create Teacher User
  const teacherUser = await User.create({
    email: 'teacher@viswaschool.com',
    password: hashedPassword,
    role: Role.TEACHER,
    status: UserStatus.ACTIVE,
    firstName: 'Meera',
    lastName: 'Patel',
    phone: '9876543212',
    customRoleId: createdRoles['Teacher'].id,
  });
  const teacherProfile = await TeacherProfile.create({
    userId: teacherUser.id,
    employeeId: 'TCH-001',
    qualification: 'M.Sc. Mathematics',
    specialization: 'Algebra',
  });
  console.log('Teacher user and profile created ✓');

  // Assign classroom to teacher
  await Classroom.updateOne({ _id: classroom.id }, { teacherId: teacherProfile.id, teacherIds: [teacherProfile.id] });
  console.log('Classroom assigned to Teacher ✓');

  // 9. Create Staff (Driver) User
  const staffUser = await User.create({
    email: 'driver@viswaschool.com',
    password: hashedPassword,
    role: Role.STAFF,
    status: UserStatus.ACTIVE,
    firstName: 'Rajesh',
    lastName: 'Kumar',
    phone: '9876543213',
    customRoleId: createdRoles['Staff'].id,
  });
  const staffProfile = await StaffProfile.create({
    userId: staffUser.id,
    employeeId: 'STF-001',
    roleType: 'DRIVER',
  });
  console.log('Staff user and profile created ✓');

  // Create Bus Route
  await BusRoute.create({
    routeName: 'Nursery Route 4',
    routeNo: 'R04',
    startPoint: 'Miyapur',
    endPoint: 'School Campus',
    driverId: staffProfile.id,
    latitude: 17.496,
    longitude: 78.34,
    etaMinutes: 12,
  });
  console.log('Bus route created ✓');

  // 10. Create Parent User
  const parentUser = await User.create({
    email: 'parent@viswaschool.com',
    password: hashedPassword,
    role: Role.PARENT,
    status: UserStatus.ACTIVE,
    firstName: 'Priya',
    lastName: 'Sharma',
    phone: '9876543214',
    customRoleId: createdRoles['Parent'].id,
  });
  const parentProfile = await ParentProfile.create({
    userId: parentUser.id,
    profession: 'Software Engineer',
    address: 'Gachibowli, Hyderabad',
  });
  console.log('Parent user and profile created ✓');

  // 11. Create Student Users
  const studentUser = await User.create({
    email: 'student@viswaschool.com',
    password: hashedPassword,
    role: Role.STUDENT,
    status: UserStatus.ACTIVE,
    firstName: 'Aarav',
    lastName: 'Sharma',
    phone: '9876543215',
    customRoleId: createdRoles['Student'].id,
  });
  await StudentProfile.create({
    userId: studentUser.id,
    admissionNo: 'ADM-2025-001',
    dob: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setFullYear(2015);
      return d;
    })(),
    gender: Gender.MALE,
    classroomId: classroom.id,
    parentId: parentProfile.id,
  });

  const nurseryStudentUser = await User.create({
    email: 'nursery_student@viswaschool.com',
    password: hashedPassword,
    role: Role.STUDENT,
    status: UserStatus.ACTIVE,
    firstName: 'Reyansh',
    lastName: 'Sharma',
    phone: '9876543216',
    customRoleId: createdRoles['Student'].id,
  });
  await StudentProfile.create({
    userId: nurseryStudentUser.id,
    admissionNo: 'ADM-2025-002',
    dob: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setFullYear(2022);
      return d;
    })(),
    gender: Gender.MALE,
    classroomId: nurseryClassroom.id,
    parentId: parentProfile.id,
  });
  console.log('Student users and profiles created ✓');

  // 12. Create default schedules
  await Schedule.create({
    classroomId: classroom.id,
    subjectId: langSubject.id,
    teacherId: teacherProfile.id,
    dayOfWeek: 1, // Monday
    startTime: '08:00',
    endTime: '09:30',
    roomNo: 'Room 101',
  });
  await Schedule.create({
    classroomId: classroom.id,
    subjectId: mathSubject.id,
    teacherId: teacherProfile.id,
    dayOfWeek: 2, // Tuesday
    startTime: '08:00',
    endTime: '09:30',
    roomNo: 'Room 101',
  });
  await Schedule.create({
    classroomId: classroom.id,
    subjectId: artsSubject.id,
    teacherId: teacherProfile.id,
    dayOfWeek: 3, // Wednesday
    startTime: '08:00',
    endTime: '09:30',
    roomNo: 'Room 101',
  });

  // Nursery A Schedules
  await Schedule.create({
    classroomId: nurseryClassroom.id,
    subjectId: mathSubject.id,
    teacherId: teacherProfile.id,
    dayOfWeek: 1, // Monday
    startTime: '10:00',
    endTime: '11:30',
    roomNo: 'Nursery Room A',
  });
  await Schedule.create({
    classroomId: nurseryClassroom.id,
    subjectId: artsSubject.id,
    teacherId: teacherProfile.id,
    dayOfWeek: 2, // Tuesday
    startTime: '10:00',
    endTime: '11:30',
    roomNo: 'Nursery Room A',
  });
  console.log('Default schedules created ✓');

  console.log('Mongoose database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  });

