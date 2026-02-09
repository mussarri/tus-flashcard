import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { FlashcardGenerationService } from './flashcard-generation.service';

interface FlashcardGenerationJobData {
  knowledgePointId: string;
  provider?: string; // Optional provider override (OPENAI or GEMINI)
}

@Processor('flashcard-generation')
export class FlashcardGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(FlashcardGenerationProcessor.name);

  constructor(
    private readonly flashcardGenerationService: FlashcardGenerationService,
  ) {
    super();
    this.logger.log('✅ FlashcardGenerationProcessor initialized and ready');
  }

  async process(job: Job<FlashcardGenerationJobData>) {
    const { knowledgePointId } = job.data;

    this.logger.log(
      `🔄 Processing flashcard generation job ${job.id} for knowledgePoint: ${knowledgePointId}`,
    );

    try {
      // Check if flashcards already exist
      const hasFlashcards =
        await this.flashcardGenerationService.hasFlashcards(knowledgePointId);

      if (hasFlashcards) {
        this.logger.log(
          `Flashcards already exist for knowledgePoint: ${knowledgePointId}, skipping generation`,
        );
        return {
          success: true,
          knowledgePointId,
          skipped: true,
          reason: 'Flashcards already exist',
        };
      }

      // Generate flashcards (template-based, provider parameter no longer used)
      const flashcards =
        await this.flashcardGenerationService.generateFlashcards(
          knowledgePointId,
        );

      console.log(flashcards);

      if (flashcards.length === 0) {
        this.logger.warn(
          `No flashcards generated for knowledgePoint: ${knowledgePointId}`,
        );
        return {
          success: true,
          knowledgePointId,
          flashcardsGenerated: 0,
          flashcardsSaved: 0,
        };
      }

      // Save to database
      const savedCount = await this.flashcardGenerationService.saveFlashcards(
        knowledgePointId,
        flashcards,
      );

      this.logger.log(
        `Flashcard generation completed for knowledgePoint: ${knowledgePointId}, generated ${flashcards.length}, saved ${savedCount}`,
      );

      return {
        success: true,
        knowledgePointId,
        flashcardsGenerated: flashcards.length,
        flashcardsSaved: savedCount,
      };
    } catch (error) {
      this.logger.error(
        `Flashcard generation job failed for knowledgePoint ${knowledgePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
}
