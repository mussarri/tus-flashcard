import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAIUsageController } from './admin-ai-usage.controller';
import { AdminAIUsageService } from './admin-ai-usage.service';
import { ExamIntelligenceService } from './exam-intelligence.service';
import { OntologyResolutionController } from './ontology-resolution.controller';
import { OntologyResolutionService } from './ontology-resolution.service';
import { QueueName } from '../queue/queues';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ExamQuestionModule } from '../exam-question/exam-question.module';
import { UnresolvedHintsModule } from './unresolved-hints/unresolved-hints.module';
import { AIRouterService } from '../ai/ai-router.service';
import { OpenAIProvider } from '../ai/providers/openai.provider';
import { GeminiProvider } from '../ai/providers/gemini.provider';
import { PricingService } from '../ai/pricing.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.FLASHCARD_GENERATION,
    }),
    BullModule.registerQueue({
      name: QueueName.QUESTION_GENERATION,
    }),
    BullModule.registerQueue({
      name: QueueName.KNOWLEDGE_EXTRACTION,
    }),
    BullModule.registerQueue({
      name: QueueName.EXAM_QUESTION_ANALYSIS,
    }),
    PrismaModule,
    CommonModule,
    ExamQuestionModule,
    UnresolvedHintsModule,
  ],
  controllers: [
    AdminController,
    AdminAIUsageController,
    OntologyResolutionController,
  ],
  providers: [
    AdminService,
    AdminAIUsageService,
    ExamIntelligenceService,
    OntologyResolutionService,
    AIRouterService,
    OpenAIProvider,
    GeminiProvider,
    PricingService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
