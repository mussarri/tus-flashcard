/* eslint-disable @typescript-eslint/no-misused-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

const logger = new Logger('Worker');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  logger.log('🔧 Worker started and listening for jobs...');
  logger.log(
    'Worker is ready to process: flashcard-generation, question-generation, knowledge-extraction, exam-question-analysis',
  );

  // Keep the process alive
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, closing worker...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, closing worker...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});
