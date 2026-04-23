import { PrismaClient, UserRole } from '@prisma/client';

import { hashPassword } from '../../src/auth/password.util';

export interface AdminSeedInput {
  email?: string;
  password?: string;
  name?: string;
}

export async function seedAdminUser(
  prisma: PrismaClient,
  input: AdminSeedInput = {},
) {
  const email = (
    input.email ??
    process.env.ADMIN_SEED_EMAIL ??
    'admin@tus.local'
  )
    .trim()
    .toLowerCase();
  const password =
    input.password ?? process.env.ADMIN_SEED_PASSWORD ?? 'Th17mac1!';
  const name = input.name ?? 'Admin';

  const passwordHash = hashPassword(password);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      email,
      name,
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  console.log(`✅ Seeded admin user: ${admin.email}`);

  return admin;
}
