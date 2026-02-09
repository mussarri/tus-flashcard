import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function migrateVisualAssets() {
  console.log('Starting visual assets migration...');

  // 1. Get all flashcards with imageAssetId
  const flashcardsWithImages = await prisma.flashcard.findMany({
    where: {
      imageAssetId: { not: null },
    },
    select: {
      id: true,
      imageAssetId: true,
    },
  });

  console.log(`Found ${flashcardsWithImages.length} flashcards with image assets`);

  // 2. Get unique imageAssetIds
  const uniqueAssetIds = [
    ...new Set(flashcardsWithImages.map((f) => f.imageAssetId).filter(Boolean)),
  ] as string[];

  console.log(`Found ${uniqueAssetIds.length} unique image asset IDs`);

  // 3. For each asset ID, check if file exists and create ImageAsset record
  const uploadsDir = path.join(__dirname, '../../uploads/visual-assets');
  let created = 0;
  let notFound = 0;

  for (const assetId of uniqueAssetIds) {
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    let foundFile: string | null = null;
    let foundExt: string | null = null;

    for (const ext of possibleExtensions) {
      const filePath = path.join(uploadsDir, `${assetId}${ext}`);
      if (fs.existsSync(filePath)) {
        foundFile = filePath;
        foundExt = ext;
        break;
      }
    }

    if (foundFile && foundExt) {
      const stats = fs.statSync(foundFile);
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };

      try {
        await prisma.imageAsset.create({
          data: {
            id: assetId,
            fileName: `${assetId}${foundExt}`,
            filePath: `uploads/visual-assets/${assetId}${foundExt}`,
            mimeType: mimeTypes[foundExt] || 'application/octet-stream',
            fileSize: stats.size,
          },
        });
        created++;
        console.log(`✓ Created ImageAsset: ${assetId}${foundExt}`);
      } catch (error) {
        console.error(`✗ Failed to create ImageAsset ${assetId}:`, error);
      }
    } else {
      console.warn(`✗ File not found for asset ID: ${assetId}`);
      notFound++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`Created: ${created}`);
  console.log(`Not found: ${notFound}`);
}

migrateVisualAssets()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
