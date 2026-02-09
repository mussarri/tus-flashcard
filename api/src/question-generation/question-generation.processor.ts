import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QuestionGenerationService } from './question-generation.service';

interface QuestionGenerationJobData {
  knowledgePointId: string;
  provider?: string; // Optional provider override (OPENAI or GEMINI)
}

@Processor('question-generation')
export class QuestionGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(QuestionGenerationProcessor.name);

  constructor(
    private readonly questionGenerationService: QuestionGenerationService,
  ) {
    super();
  }

  async process(job: Job<QuestionGenerationJobData>) {
    const { knowledgePointId, provider } = job.data;

    this.logger.log(
      `Processing question generation job for knowledgePoint: ${knowledgePointId}`,
    );

    try {
      // Check if question already exists
      const hasQuestion =
        await this.questionGenerationService.hasQuestion(knowledgePointId);

      if (hasQuestion) {
        this.logger.log(
          `Question already exists for knowledgePoint: ${knowledgePointId}, skipping generation`,
        );
        return {
          success: true,
          knowledgePointId,
          skipped: true,
          reason: 'Question already exists',
        };
      }

      // Generate question with similarity checking and optional provider override
      const { question: questionData, similarQuestionIds } =
        await this.questionGenerationService.generateQuestionWithSimilarityCheck(
          knowledgePointId,
          provider as 'OPENAI' | 'GEMINI' | undefined,
        );

      // Save to database
      const questionId = await this.questionGenerationService.saveQuestion(
        knowledgePointId,
        questionData,
        similarQuestionIds,
      );

      this.logger.log(
        `Question generation completed for knowledgePoint: ${knowledgePointId}, questionId: ${questionId}`,
      );

      return {
        success: true,
        knowledgePointId,
        questionId,
      };
    } catch (error) {
      this.logger.error(
        `Question generation job failed for knowledgePoint ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}
