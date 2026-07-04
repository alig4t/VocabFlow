import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  console.log('Starting database seed...');

  // Create learning module
  const module = await prisma.learningModule.upsert({
    where: { slug: 'vocabulary' },
    update: {},
    create: {
      name: '4000 Essential English Words',
      slug: 'vocabulary',
      description: 'Core vocabulary for English learners',
      isActive: true,
      order: 1,
    },
  });
  console.log(`Created module: ${module.name}`);

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      name: 'Admin',
      role: Role.ADMIN,
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  // Create regular user
  const userPasswordHash = await bcrypt.hash('User123!', SALT_ROUNDS);
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      name: 'Test User',
      role: Role.USER,
    },
  });
  console.log(`Created regular user: ${regularUser.email}`);

  // سید کردن لغات حذف شد - فقط کاربران ایجاد می‌شوند
  
  console.log('Database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Error during database seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });