import { PrismaClient, UserRole } from '@prisma/client';

import { randomBytes, scryptSync } from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

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
