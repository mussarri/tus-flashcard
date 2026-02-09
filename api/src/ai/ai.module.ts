import { Module, forwardRef } from '@nestjs/common';
import { AIRouterService } from './ai-router.service';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { PricingService } from './pricing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamQuestionModule } from '../exam-question/exam-question.module';

@Module({
  imports: [PrismaModule, forwardRef(() => ExamQuestionModule)],
  providers: [AIRouterService, OpenAIProvider, GeminiProvider, PricingService],
  exports: [AIRouterService],
})
export class AIModule {}
