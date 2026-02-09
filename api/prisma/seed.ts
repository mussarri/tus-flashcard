/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PrismaClient } from '@prisma/client';
import { allConcepts } from './seeds';
import { normalizeConceptKey } from '../src/common/normalize/normalize-concept-key';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding TUS Anatomy (modular)...');

  const lesson = await prisma.lesson.upsert({
    where: { name: 'Anatomi' },
    update: {},
    create: {
      name: 'Anatomi',
      displayName: 'Anatomi',
    },
  });

  console.log(`✅ Created lesson: ${lesson.displayName}`);

  for (const c of allConcepts.flat()) {
    const normalizedLabel = normalizeConceptKey(c.preferredLabel);

    const concept = await prisma.concept.upsert({
      where: { normalizedLabel },
      update: {
        conceptType: c.conceptType,
        status: 'ACTIVE',
      },
      create: {
        preferredLabel: c.preferredLabel,
        normalizedLabel,
        conceptType: c.conceptType,
      },
    });

    for (const a of c.aliases) {
      const normalizedAlias = normalizeConceptKey(a.alias);

      await prisma.conceptAlias.upsert({
        where: { normalizedAlias },
        update: { isActive: true },
        create: {
          conceptId: concept.id,
          alias: a.alias,
          normalizedAlias,
          language: a.language,
          source: 'IMPORT',
        },
      });
    }

    console.log(`✅ ${c.preferredLabel}`);
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
