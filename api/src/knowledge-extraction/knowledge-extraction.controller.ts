/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Post, Body, Logger } from '@nestjs/common';
import { KnowledgeExtractionService } from './knowledge-extraction.service';

@Controller('knowledge-extraction')
export class KnowledgeExtractionController {
  private readonly logger = new Logger(KnowledgeExtractionController.name);

  constructor(
    private readonly knowledgeExtractionService: KnowledgeExtractionService,
  ) {}

  /**
   * Generate Knowledge Points from analyzed Anatomy exam questions
   * POST /knowledge-extraction/admin/generate/exam-questions
   */
  @Post('admin/generate/exam-questions')
  async generateFromExamQuestions(
    @Body() body: { examQuestionIds: string[] },
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      examQuestionId: string;
      kpCount?: number;
      spotRuleCount?: number;
      clinicalCorrelationCount?: number;
      examTrapCount?: number;
      error?: string;
      success: boolean;
    }>;
  }> {
    this.logger.log(
      `Admin generating KPs from ${body.examQuestionIds.length} exam questions`,
    );

    const results: Array<{
      examQuestionId: string;
      kpCount?: number;
      spotRuleCount?: number;
      clinicalCorrelationCount?: number;
      examTrapCount?: number;
      error?: string;
      success: boolean;
    }> = [];

    for (const eqId of body.examQuestionIds) {
      try {
        const result =
          await this.knowledgeExtractionService.generateKnowledgePointsFromExamQuestion(
            eqId,
          );

        const totalKps = result.knowledgePoints.length;

        results.push({
          examQuestionId: eqId,
          kpCount: totalKps,
          spotRuleCount: result.spotRuleCount,
          clinicalCorrelationCount: result.clinicalCorrelationCount,
          examTrapCount: result.examTrapCount,
          success: true,
        });
      } catch (error) {
        results.push({
          examQuestionId: eqId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    this.logger.log(
      `KP generation completed: ${successful} successful, ${failed} failed`,
    );

    return {
      total: body.examQuestionIds.length,
      successful,
      failed,
      results,
    };
  }
}
