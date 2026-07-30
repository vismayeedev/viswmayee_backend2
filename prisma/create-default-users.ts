import { PrismaClient, Role, UserStatus, Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating default users for manual verification...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Get role IDs
  const roles = await prisma.customRole.findMany();
  const getRoleId = (name: string) => roles.find(r => r.name === name)?.id;

  // 2. Create Principal
  const principal = await prisma.user.upsert({
    where: { email: 'principal@viswaschool.com' },
    update: {},
    create: {
      email: 'principal@viswaschool.com',
      password: hashedPassword,
      role: Role.PRINCIPAL,
      status: UserStatus.ACTIVE,
      firstName: 'Anita',
      lastName: 'Rao',
      phone: '9876543210',
      customRoleId: getRoleId('Principal'),
      principalProfile: { create: {} },
    },
  });
  console.log('Principal created/updated');

  // 3. Create Centre Head
  const vp = await prisma.user.upsert({
    where: { email: 'vp@viswaschool.com' },
    update: {},
    create: {
      email: 'vp@viswaschool.com',
      password: hashedPassword,
      role: Role.VICE_PRINCIPAL,
      status: UserStatus.ACTIVE,
      firstName: 'Vikram',
      lastName: 'Sen',
      phone: '9876543211',
      customRoleId: getRoleId('VP'),
      vpProfile: { create: {} },
    },
  });
  console.log('VP created/updated');

  // 4. Create Teacher (teacher@viswaschool.com)
  // Let's check or create a classroom for Grade 6
  let classroom = await prisma.classroom.findFirst();
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        name: 'Grade 6',
        gradeLevel: 6,
      },
    });
  }

  // Check or create subjects
  let langSubject = await prisma.subject.findFirst({
    where: { code: 'LANG' },
  });
  if (!langSubject) {
    langSubject = await prisma.subject.create({
      data: {
        name: 'Language Arts',
        code: 'LANG',
      },
    });
  }

  let mathSubject = await prisma.subject.findFirst({
    where: { code: 'MATH' },
  });
  if (!mathSubject) {
    mathSubject = await prisma.subject.create({
      data: {
        name: 'Math & Shapes',
        code: 'MATH',
      },
    });
  }

  let artsSubject = await prisma.subject.findFirst({
    where: { code: 'ARTS' },
  });
  if (!artsSubject) {
    artsSubject = await prisma.subject.create({
      data: {
        name: 'Creative Arts',
        code: 'ARTS',
      },
    });
  }

  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@viswaschool.com' },
    update: {},
    create: {
      email: 'teacher@viswaschool.com',
      password: hashedPassword,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      firstName: 'Meera',
      lastName: 'Patel',
      phone: '9876543212',
      customRoleId: getRoleId('Teacher'),
      teacherProfile: {
        create: {
          employeeId: 'TCH-001',
          qualification: 'M.Sc. Mathematics',
          specialization: 'Algebra',
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log('Teacher created/updated');

  // Assign classroom to teacher if not already
  if (teacherUser.teacherProfile && classroom) {
    await prisma.classroom.update({
      where: { id: classroom.id },
      data: { teacherId: teacherUser.teacherProfile.id },
    });
    console.log('Classroom assigned to Teacher');
  }

  // 5. Create Staff (driver@viswaschool.com)
  const staffUser = await prisma.user.upsert({
    where: { email: 'driver@viswaschool.com' },
    update: {},
    create: {
      email: 'driver@viswaschool.com',
      password: hashedPassword,
      role: Role.STAFF,
      status: UserStatus.ACTIVE,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      phone: '9876543213',
      customRoleId: getRoleId('Staff'),
      staffProfile: {
        create: {
          employeeId: 'STF-001',
          roleType: 'DRIVER',
        },
      },
    },
    include: { staffProfile: true },
  });
  console.log('Staff created/updated');

  // Create Bus Route if not exists
  if (staffUser.staffProfile) {
    let route = await prisma.busRoute.findFirst({
      where: { driverId: staffUser.staffProfile.id },
    });
    if (!route) {
      route = await prisma.busRoute.create({
        data: {
          routeName: 'Nursery Route 4',
          routeNo: 'R04',
          startPoint: 'Miyapur',
          endPoint: 'School Campus',
          driverId: staffUser.staffProfile.id,
          latitude: 17.496,
          longitude: 78.34,
          etaMinutes: 12,
        },
      });
      console.log('Bus Route created');
    }
  }

  // 6. Create Parent (parent@viswaschool.com)
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@viswaschool.com' },
    update: {},
    create: {
      email: 'parent@viswaschool.com',
      password: hashedPassword,
      role: Role.PARENT,
      status: UserStatus.ACTIVE,
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '9876543214',
      customRoleId: getRoleId('Parent'),
      parentProfile: {
        create: {
          profession: 'Software Engineer',
          address: 'Gachibowli, Hyderabad',
        },
      },
    },
    include: { parentProfile: true },
  });
  console.log('Parent created/updated');

  // 7. Create Student (student@viswaschool.com)
  if (parentUser.parentProfile && classroom) {
    const studentUser = await prisma.user.upsert({
      where: { email: 'student@viswaschool.com' },
      update: {},
      create: {
        email: 'student@viswaschool.com',
        password: hashedPassword,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        firstName: 'Aarav',
        lastName: 'Sharma',
        phone: '9876543215',
        customRoleId: getRoleId('Student'),
        studentProfile: {
          create: {
            admissionNo: 'ADM-2025-001',
            dob: new Date('2021-06-15'),
            gender: Gender.MALE,
            classroomId: classroom.id,
            parentId: parentUser.parentProfile.id,
          },
        },
      },
      include: { studentProfile: true },
    });
    console.log('Student created/updated');

    // Create schedules for student's classroom
    if (studentUser.studentProfile && teacherUser.teacherProfile && langSubject && mathSubject && artsSubject) {
      const scheduleCount = await prisma.schedule.count({
        where: { classroomId: classroom.id },
      });
      if (scheduleCount === 0) {
        await prisma.schedule.create({
          data: {
            classroomId: classroom.id,
            subjectId: langSubject.id,
            teacherId: teacherUser.teacherProfile.id,
            dayOfWeek: 1, // Monday
            startTime: '08:00',
            endTime: '09:30',
            roomNo: 'Room 101',
          },
        });
        await prisma.schedule.create({
          data: {
            classroomId: classroom.id,
            subjectId: mathSubject.id,
            teacherId: teacherUser.teacherProfile.id,
            dayOfWeek: 2, // Tuesday
            startTime: '08:00',
            endTime: '09:30',
            roomNo: 'Room 101',
          },
        });
        await prisma.schedule.create({
          data: {
            classroomId: classroom.id,
            subjectId: artsSubject.id,
            teacherId: teacherUser.teacherProfile.id,
            dayOfWeek: 3, // Wednesday
            startTime: '08:00',
            endTime: '09:30',
            roomNo: 'Room 101',
          },
        });
        console.log('Default Schedules created');
      }
    }
  }

  console.log('Default users successfully created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

