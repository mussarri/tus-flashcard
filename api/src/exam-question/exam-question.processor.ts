import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ExamQuestionService } from './exam-question.service';
import { PrerequisiteLearningService } from './prerequisite-learning.service';
import { ExamQuestionRegistryService } from './exam-question-registry.service';

interface ExamQuestionAnalysisJobData {
  examQuestionId: string;
}

@Processor('exam-question-analysis')
export class ExamQuestionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExamQuestionProcessor.name);

  constructor(
    private readonly examQuestionService: ExamQuestionService,
    private readonly prerequisiteLearningService: PrerequisiteLearningService,
    private readonly registryService: ExamQuestionRegistryService,
  ) {
    super();
  }

  async process(job: Job<ExamQuestionAnalysisJobData>) {
    const { examQuestionId } = job.data;
    this.logger.log(
      `------------------------------------------------------------------`,
    );
    this.logger.log(
      `Processing exam question analysis job for: ${examQuestionId}`,
    );

    try {
      const result =
        await this.examQuestionService.analyzeExamQuestion(examQuestionId);

      this.logger.log(
        `Exam question analysis completed for ${examQuestionId}: lesson=${result.lesson}, topic=${result.topic}`,
      );

      console.log(result);

      // Register lesson, topic, subtopic in registry
      try {
        await this.registryService.registerAnalysisResults(
          result.lesson,
          result.topic,
          result.subtopic,
          examQuestionId,
        );
        this.logger.log(
          `Registry updated for question ${examQuestionId}: ${result.lesson} > ${result.topic} > ${result.subtopic}`,
        );
      } catch (registryError) {
        this.logger.error(
          `Failed to update registry for question ${examQuestionId}: ${registryError instanceof Error ? registryError.message : 'Unknown error'}`,
        );
        // Don't fail the job if registry update fails
      }

      // Update prerequisite graph for anatomy questions

      try {
        await this.prerequisiteLearningService.processAnalyzedQuestion(
          examQuestionId,
        );
        this.logger.log(
          `Prerequisite graph updated for question ${examQuestionId}`,
        );
      } catch (prereqError) {
        this.logger.error(
          `Failed to update prerequisite graph for question ${examQuestionId}: ${prereqError instanceof Error ? prereqError.message : 'Unknown error'}`,
        );
        // Don't fail the job if prerequisite learning fails
      }

      this.logger.log(
        `------------------------------------------------------------------`,
      );

      return {
        success: true,
        examQuestionId,
        result,
      };
    } catch (error) {
      this.logger.error(
        `Exam question analysis job failed for ${examQuestionId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}
