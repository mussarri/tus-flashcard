import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeExtractionService } from './knowledge-extraction.service';
import { KnowledgeExtractionProcessor } from './knowledge-extraction.processor';
import { KnowledgeExtractionController } from './knowledge-extraction.controller';
import { QueueName } from '../queue/queues';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { KnowledgePointGeneratorService } from './knowledge-point-generator.service';
import { KnowledgePointRepository } from './knowledge-point.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.KNOWLEDGE_EXTRACTION,
    }),
    BullModule.registerQueue({
      name: QueueName.FLASHCARD_GENERATION,
    }),
    BullModule.registerQueue({
      name: QueueName.QUESTION_GENERATION,
    }),
    PrismaModule,
    forwardRef(() => AIModule),
  ],
  controllers: [KnowledgeExtractionController],
  providers: [
    KnowledgeExtractionService,
    KnowledgeExtractionProcessor,
    KnowledgePointGeneratorService,
    KnowledgePointRepository,
  ],
  exports: [KnowledgeExtractionService],
})
export class KnowledgeExtractionModule {}
