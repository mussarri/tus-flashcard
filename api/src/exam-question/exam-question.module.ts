import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExamQuestionService } from './exam-question.service';
import { ExamQuestionProcessor } from './exam-question.processor';
import { ExamQuestionSimilarityService } from './exam-question-similarity.service';
import { ExamQuestionRegistryService } from './exam-question-registry.service';
import { BulkParserService } from './bulk-parser.service';
import { PrerequisiteLearningService } from './prerequisite-learning.service';
import { QueueName } from '../queue/queues';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { QuestionGenerationModule } from '../question-generation/question-generation.module';
import { UnresolvedHintsModule } from '../admin/unresolved-hints/unresolved-hints.module';
import { ConceptModule } from '../concept/concept.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.EXAM_QUESTION_ANALYSIS,
    }),
    PrismaModule,
    forwardRef(() => AIModule),
    forwardRef(() => QuestionGenerationModule),
    UnresolvedHintsModule,
    ConceptModule,
  ],
  providers: [
    ExamQuestionService,
    ExamQuestionProcessor,
    ExamQuestionSimilarityService,
    ExamQuestionRegistryService,
    BulkParserService,
    PrerequisiteLearningService,
  ],
  exports: [
    ExamQuestionService,
    ExamQuestionSimilarityService,
    ExamQuestionRegistryService,
    BulkParserService,
    PrerequisiteLearningService,
  ],
})
export class ExamQuestionModule {}
