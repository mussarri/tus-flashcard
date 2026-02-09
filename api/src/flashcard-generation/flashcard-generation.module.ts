import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FlashcardGenerationService } from './flashcard-generation.service';
import { FlashcardGenerationProcessor } from './flashcard-generation.processor';
import { FlashcardGenerationController } from './flashcard-generation.controller';
import { AdaptiveAlgorithmService } from './adaptive-algorithm.service';
import { QueueName } from '../queue/queues';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.FLASHCARD_GENERATION,
    }),
    PrismaModule,
    CommonModule,
    AIModule,
  ],
  controllers: [FlashcardGenerationController],
  providers: [
    FlashcardGenerationService,
    FlashcardGenerationProcessor,
    AdaptiveAlgorithmService,
  ],
  exports: [FlashcardGenerationService, AdaptiveAlgorithmService],
})
export class FlashcardGenerationModule {}
