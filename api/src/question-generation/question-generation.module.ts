import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QuestionGenerationService } from './question-generation.service';
import { QuestionGenerationProcessor } from './question-generation.processor';
import { QueueName } from '../queue/queues';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.QUESTION_GENERATION,
    }),
    PrismaModule,
    forwardRef(() => AIModule),
  ],
  providers: [QuestionGenerationService, QuestionGenerationProcessor],
  exports: [QuestionGenerationService],
})
export class QuestionGenerationModule {}
