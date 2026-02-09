import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { UploadModule } from './upload/upload.module';
import { VisionModule } from './vision/vision.module';
import { ParsingModule } from './parsing/parsing.module';
import { ApprovalModule } from './approval/approval.module';
import { KnowledgeExtractionModule } from './knowledge-extraction/knowledge-extraction.module';
import { FlashcardGenerationModule } from './flashcard-generation/flashcard-generation.module';
import { QuestionGenerationModule } from './question-generation/question-generation.module';
import { ExamQuestionModule } from './exam-question/exam-question.module';
import { AIModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { ConceptModule } from './concept/concept.module';
import { StudentModule } from './student/student.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    QueueModule,
    AIModule,
    UploadModule,
    VisionModule,
    ParsingModule,
    ApprovalModule,
    KnowledgeExtractionModule,
    FlashcardGenerationModule,
    QuestionGenerationModule,
    ExamQuestionModule,
    AdminModule,
    ConceptModule,
    StudentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
