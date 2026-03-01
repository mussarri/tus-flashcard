import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { KnowledgeExtractionService } from '../src/knowledge-extraction/knowledge-extraction.service';

async function main() {
  const approvedContentId = process.argv[2];

  if (!approvedContentId) {
    console.error('Usage: ts-node scripts/run-knowledge-extraction.ts <approvedContentId>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const extractionService = app.get(KnowledgeExtractionService);
    const result = await extractionService.processApprovedContentExtraction(
      approvedContentId,
    );

    console.log('Knowledge extraction completed:', result);
  } catch (error) {
    console.error(
      'Knowledge extraction failed:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
