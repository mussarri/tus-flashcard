/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PrismaClient } from '@prisma/client';
import { allConcepts } from './seeds';
import { seedAdminUser } from './seeds/admin';
import { normalizeConceptKey } from '../src/common/normalize/normalize-concept-key';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding TUS Anatomy (modular)...');

  await seedAdminUser(prisma);

  await prisma.lesson.upsert({
    where: { name: 'Anatomi' },
    update: {},
    create: {
      name: 'Anatomi',
      displayName: 'Anatomi',
    },
  });
  await prisma.lesson.upsert({
    where: { name: 'Fizyoloji' },
    update: {},
    create: {
      name: 'Fizyoloji',
      displayName: 'Fizyoloji',
    },
  });
  await prisma.lesson.upsert({
    where: { name: 'Patoloji' },
    update: {},
    create: {
      name: 'Patoloji',
      displayName: 'Patoloji',
    },
  });
  await prisma.lesson.upsert({
    where: { name: 'Biyokimya' },
    update: {},
    create: {
      name: 'Biyokimya',
      displayName: 'Biyokimya',
    },
  });
  await prisma.lesson.upsert({
    where: { name: 'Histoloji' },
    update: {},
    create: {
      name: 'Histoloji',
      displayName: 'Histoloji',
    },
  });
  await prisma.lesson.upsert({
    where: { name: 'Farmakoloji' },
    update: {},
    create: {
      name: 'Farmakoloji',
      displayName: 'Farmakoloji',
    },
  });
  await prisma.lesson.upsert({
    where: { name: 'Mikrobiyoloji' },
    update: {},
    create: {
      name: 'Mikrobiyoloji',
      displayName: 'Mikrobiyoloji',
    },
  });

  console.log(`✅ Created lesson: Anatomi`);
  console.log(`✅ Created lesson: Fizyoloji`);
  console.log(`✅ Created lesson: Patoloji`);
  console.log(`✅ Created lesson: Histoloji`);
  console.log(`✅ Created lesson: Biyokimya`);
  console.log(`✅ Created lesson: Mikrobiyoloji`);
  console.log(`✅ Created lesson: Farmakoloji`);
  // for (const c of allConcepts.flat()) {
  //   const normalizedLabel = normalizeConceptKey(c.preferredLabel);

  //   const concept = await prisma.concept.upsert({
  //     where: { normalizedLabel },
  //     update: {
  //       conceptType: c.conceptType,
  //       status: 'ACTIVE',
  //     },
  //     create: {
  //       preferredLabel: c.preferredLabel,
  //       normalizedLabel,
  //       conceptType: c.conceptType,
  //     },
  //   });

  //   for (const a of c.aliases) {
  //     const normalizedAlias = normalizeConceptKey(a.alias);

  //     await prisma.conceptAlias.upsert({
  //       where: { normalizedAlias },
  //       update: { isActive: true },
  //       create: {
  //         conceptId: concept.id,
  //         alias: a.alias,
  //         normalizedAlias,
  //         language: a.language,
  //         source: 'IMPORT',
  //       },
  //     });
  //   }

  //   console.log(`✅ ${c.preferredLabel}`);
  // }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
