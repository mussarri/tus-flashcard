import { BadRequestException, Logger } from '@nestjs/common';
import { BatchStatus, ExtractionStatus, AnalysisStatus } from '@prisma/client';

const logger = new Logger('StateMachineValidator');

/**
 * Valid state transitions for Batch
 */
const BATCH_STATE_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'], // Just created, waiting for processing
  PROCESSING: ['UPLOADED', 'CANCELLED'], // OCR jobs queued/processing
  UPLOADED: ['CLASSIFIED', 'CANCELLED'], // Files uploaded and ready
  CLASSIFIED: ['REVIEWED', 'CANCELLED'], // OCR and classification completed
  REVIEWED: ['KNOWLEDGE_EXTRACTED', 'CANCELLED'], // Admin review completed
  KNOWLEDGE_EXTRACTED: ['COMPLETED', 'CANCELLED'], // Knowledge extraction completed
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Valid state transitions for ApprovedContent extraction
 */
const EXTRACTION_STATE_TRANSITIONS: Record<
  ExtractionStatus,
  ExtractionStatus[]
> = {
  NOT_STARTED: ['QUEUED', 'NOT_STARTED'], // Can reset to NOT_STARTED for reprocessing
  QUEUED: ['PROCESSING', 'NOT_STARTED'],
  PROCESSING: ['COMPLETED', 'FAILED', 'NOT_STARTED'],
  COMPLETED: ['VERIFIED', 'NOT_STARTED'], // Can reprocess by resetting to NOT_STARTED
  VERIFIED: ['NOT_STARTED'], // Can reprocess by resetting to NOT_STARTED
  FAILED: ['NOT_STARTED', 'QUEUED'], // Can retry
};

export class StateMachineValidator {
  /**
   * Validate batch state transition
   */
  static validateBatchTransition(
    currentStatus: BatchStatus,
    newStatus: BatchStatus,
  ): void {
    const allowedTransitions = BATCH_STATE_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      logger.error(
        `Invalid batch state transition: ${currentStatus} -> ${newStatus}`,
      );
      throw new BadRequestException(
        `Invalid state transition: Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      );
    }
  }

  /**
   * Validate extraction status transition
   */
  static validateExtractionTransition(
    currentStatus: ExtractionStatus,
    newStatus: ExtractionStatus,
  ): void {
    const allowedTransitions = EXTRACTION_STATE_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      logger.error(
        `Invalid extraction state transition: ${currentStatus} -> ${newStatus}`,
      );
      throw new BadRequestException(
        `Invalid extraction state transition: Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      );
    }
  }

  /**
   * Check if extraction can be triggered
   * Extraction can only be triggered if status is NOT_STARTED or VERIFIED (for reprocessing)
   */
  static canTriggerExtraction(status: ExtractionStatus): boolean {
    return status === 'NOT_STARTED' || status === 'VERIFIED';
  }

  /**
   * Check if content can be reprocessed
   */
  static canReprocessExtraction(status: ExtractionStatus): boolean {
    return (
      status === 'COMPLETED' || status === 'VERIFIED' || status === 'FAILED'
    );
  }

  /**
   * Valid state transitions for ExamQuestion
   */
  static readonly EXAM_QUESTION_STATE_TRANSITIONS: Record<
    AnalysisStatus,
    AnalysisStatus[]
  > = {
    RAW: ['PENDING', 'PROCESSING'], // Bulk uploaded, can be queued or directly processed
    PENDING: ['PROCESSING'],
    PROCESSING: ['ANALYZED', 'FAILED'],
    ANALYZED: ['KNOWLEDGE_READY', 'PROCESSING'], // Can re-analyze
    KNOWLEDGE_READY: ['CONTENT_READY'],
    CONTENT_READY: [], // Terminal state
    FAILED: ['PENDING', 'PROCESSING'], // Can retry
    // Add the missing keys here:
    REVIEWED: [],
    NEEDS_REVIEW: ['PROCESSING'], // or whatever your logic requires
  };

  /**
   * Validate exam question state transition
   */
  static validateExamQuestionTransition(
    currentStatus: AnalysisStatus,
    newStatus: AnalysisStatus,
  ): void {
    const allowedTransitions =
      StateMachineValidator.EXAM_QUESTION_STATE_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      logger.error(
        `Invalid exam question state transition: ${currentStatus} -> ${newStatus}`,
      );
      throw new BadRequestException(
        `Invalid state transition: Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      );
    }
  }

  /**
   * Check if analysis can be triggered
   */
  static canTriggerAnalysis(status: AnalysisStatus): boolean {
    return (
      status === 'RAW' ||
      status === 'PENDING' ||
      status === 'FAILED' ||
      status === 'ANALYZED'
    );
  }

  /**
   * Check if knowledge generation can be triggered
   */
  static canGenerateKnowledge(status: AnalysisStatus): boolean {
    return status === 'ANALYZED';
  }

  /**
   * Check if question/flashcard generation can be triggered
   */
  static canGenerateContent(status: AnalysisStatus): boolean {
    return status === 'KNOWLEDGE_READY';
  }
}
