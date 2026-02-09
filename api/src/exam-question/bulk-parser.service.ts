import { Injectable, Logger } from '@nestjs/common';

export interface ParsedQuestion {
  questionText: string;
  options: Record<string, string>;
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  year?: number;
  examType?: string;
  questionNumber?: number;
  explanation?: string;
  rawText: string; // Original raw text block
}

export interface ParseResult {
  totalParsed: number;
  validQuestions: ParsedQuestion[];
  invalidQuestions: Array<{
    index: number;
    questionText: string;
    reason: string;
  }>;
}

@Injectable()
export class BulkParserService {
  private readonly logger = new Logger(BulkParserService.name);

  /**
   * Parse multiple questions from a text block
   */
  parseBulkText(text: string): ParseResult {
    this.logger.debug('Parsing bulk text input');

    // Split by question separators
    const questionBlocks = this.splitIntoQuestions(text);
    this.logger.debug(
      `Found ${questionBlocks.length} potential question blocks`,
    );

    const validQuestions: ParsedQuestion[] = [];
    const invalidQuestions: Array<{
      index: number;
      questionText: string;
      reason: string;
    }> = [];

    questionBlocks.forEach((block, index) => {
      try {
        const parsed = this.parseQuestionBlock(block);

        // Validate
        const validationError = this.validateQuestion(parsed);
        if (validationError) {
          invalidQuestions.push({
            index: index + 1,
            questionText: parsed.questionText.substring(0, 100) + '...',
            reason: validationError,
          });
        } else {
          validQuestions.push(parsed);
        }
      } catch (error) {
        invalidQuestions.push({
          index: index + 1,
          questionText: block.substring(0, 100) + '...',
          reason:
            error instanceof Error ? error.message : 'Unknown parsing error',
        });
      }
    });

    return {
      totalParsed: questionBlocks.length,
      validQuestions,
      invalidQuestions,
    };
  }

  /**
   * Split text into individual question blocks
   * Supports: "### SORU", "---", "Soru X)", double newlines
   */
  private splitIntoQuestions(text: string): string[] {
    // Normalize line endings
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const blocks: string[] = [];

    // Pattern 1: "### SORU" separator (primary)
    const soruHashParts = normalized.split(/\n\s*###\s*SORU\s*\n/i);
    if (soruHashParts.length > 1) {
      for (const part of soruHashParts) {
        const trimmed = part.trim();
        if (trimmed.length > 50) {
          blocks.push(trimmed);
        }
      }
      if (blocks.length > 0) {
        return blocks;
      }
    }

    // Pattern 2: "---" separator
    const dashParts = normalized.split(/\n\s*---+\s*\n/);
    if (dashParts.length > 1) {
      for (const part of dashParts) {
        const trimmed = part.trim();
        if (trimmed.length > 50) {
          blocks.push(trimmed);
        }
      }
      if (blocks.length > 0) {
        return blocks;
      }
    }

    // Pattern 3: "Soru X)" at start of line
    const soruParts = normalized.split(/\n(?=Soru\s+\d+\))/i);
    if (soruParts.length > 1) {
      for (const part of soruParts) {
        const trimmed = part.trim();
        if (trimmed.length > 50) {
          blocks.push(trimmed);
        }
      }
      if (blocks.length > 0) {
        return blocks;
      }
    }

    // Pattern 4: Two or more line breaks
    const doubleNewlineParts = normalized.split(/\n\s*\n\s*\n+/);
    if (doubleNewlineParts.length > 1) {
      for (const part of doubleNewlineParts) {
        const trimmed = part.trim();
        if (trimmed.length > 50) {
          // Only consider substantial blocks
          blocks.push(trimmed);
        }
      }
      if (blocks.length > 0) {
        return blocks;
      }
    }

    // If no separators found, treat as single question
    return [normalized.trim()];
  }

  /**
   * Parse a single question block
   */
  private parseQuestionBlock(block: string): ParsedQuestion {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Extract correct answer first
    const correctAnswerMatch = block.match(/Doğru\s+Cevap:\s*([A-E])/i);
    const correctAnswer = correctAnswerMatch
      ? (correctAnswerMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E')
      : null;

    // Extract year, examType, questionNumber from header if present
    let year: number | undefined;
    let examType: string | undefined;
    let questionNumber: number | undefined;

    const soruMatch = block.match(/Soru\s+(\d+)\)/i);
    if (soruMatch) {
      questionNumber = parseInt(soruMatch[1], 10);
    }

    // Extract options (A), B), C), D), E))
    const options: Record<string, string> = {};
    const optionPattern = /^([A-E])\)\s*(.+)$/i;

    for (const line of lines) {
      const match = line.match(optionPattern);
      if (match) {
        const key = match[1].toUpperCase();
        const value = match[2].trim();
        options[key] = value;
      }
    }

    // Extract explanation if present (after "Doğru Cevap:")
    let explanation: string | undefined;
    const explanationMatch = block.match(
      /Doğru\s+Cevap:\s*[A-E]\s*\n\s*(.+)/is,
    );
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
    }

    // Question text is everything including options, but excluding "Doğru Cevap:" line and explanation
    let questionText = block;

    // Remove "Doğru Cevap:" line and everything after it (including explanation)
    questionText = questionText.replace(/Doğru\s+Cevap:.*$/ims, '').trim();

    return {
      questionText: questionText.trim(),
      options,
      correctAnswer,
      year,
      examType,
      questionNumber,
      explanation,
      rawText: block, // Store original text
    };
  }

  /**
   * Validate a parsed question
   * NOTE: Correct answer is OPTIONAL (per requirements)
   */
  private validateQuestion(parsed: ParsedQuestion): string | null {
    // Check options - minimum 4 required
    const optionKeys = Object.keys(parsed.options);
    if (optionKeys.length < 4) {
      return `At least 4 options (A-E) required, found ${optionKeys.length}`;
    }

    // Check if correct answer exists in options (if provided)
    if (parsed.correctAnswer && !optionKeys.includes(parsed.correctAnswer)) {
      return `Correct answer ${parsed.correctAnswer} not found in options`;
    }

    // Check question text length (including stem)
    if (parsed.questionText.length < 20) {
      return 'Question text too short (minimum 20 characters)';
    }

    // Check that each option has content
    for (const [key, value] of Object.entries(parsed.options)) {
      if (!value || value.trim().length === 0) {
        return `Option ${key} is empty`;
      }
    }

    return null; // Valid
  }
}
