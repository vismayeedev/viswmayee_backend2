import { PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserStatuses() {
  console.log('Fixing user statuses to ACTIVE...');

  const emails = [
    'admin@viswaschool.com',
    'principal@viswaschool.com',
    'vp@viswaschool.com',
    'teacher@viswaschool.com',
    'driver@viswaschool.com',
    'parent@viswaschool.com',
    'student@viswaschool.com',
  ];

  const result = await prisma.user.updateMany({
    where: {
      email: { in: emails },
    },
    data: {
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`✅ Updated ${result.count} users to ACTIVE status.`);

  // Verify
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, status: true, role: true },
  });

  console.log('\nCurrent user statuses:');
  users.forEach(u => {
    console.log(`  ${u.email} → ${u.status} (${u.role})`);
  });

  await prisma.$disconnect();
}

fixUserStatuses().catch((e) => {
  console.error(e);
  process.exit(1);
});
