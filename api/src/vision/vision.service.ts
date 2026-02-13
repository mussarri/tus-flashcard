/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, HttpException } from '@nestjs/common';
import { AIRouterService } from '../ai/ai-router.service';
import { AITaskType } from '../ai/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
// import * as pdf from 'pdf-poppler'; // Removed: Not compatible with Alpine Linux

export interface ExtractedQuestion {
  stem: string;
  options: string[];
  concept: string;
}

export interface GeneratedQuestion {
  stem: string;
  options: string[];
  answer_index: number;
}

export interface PageAnalysis {
  page_type: 'question' | 'theory' | 'mixed';
  learning_points: string[];
  exam_focus_points: string[];
  extracted_questions: ExtractedQuestion[];
  generated_questions: GeneratedQuestion[];
}

export interface ContentBlock {
  type: 'TEXT' | 'TABLE' | 'ALGORITHM' | 'SPOT';
  short_title: string;
  content: string | string[][] | string[];
}

export interface BlocksAnalysis {
  blocks: ContentBlock[];
}

// NEW: Vision Parse Response Interface
export interface ExtractedTable {
  headers: string[];
  rows: string[][];
}

export interface ExtractedContent {
  text_blocks: string[];
  tables?: ExtractedTable[];
  algorithms?: string[];
}

export interface VisionParseResponse {
  extracted_content: ExtractedContent;
  classification: {
    lesson?: string;
    topic?: string;
    subtopic?: string;
  };
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(private readonly aiRouter: AIRouterService) {
    this.logger.log('Vision service initialized with AI Router');
  }

  private async convertImageToBase64(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return fileBuffer.toString('base64');
  }

  private getImageMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  private async analyzeImageBuffer(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<BlocksAnalysis> {
    try {
      const base64Image = imageBuffer.toString('base64');

      // Use AI Router
      const response = await this.aiRouter.runTask(AITaskType.VISION_PARSE, {
        imageBase64: base64Image,
        mimeType,
      });
      console.log('response', response);
      // Extract JSON from response
      let jsonContent = response;
      if (response.includes('```json')) {
        const jsonStart = response.indexOf('```json') + 7;
        const jsonEnd = response.indexOf('```', jsonStart);
        jsonContent = response.substring(jsonStart, jsonEnd).trim();
      } else if (response.includes('```')) {
        const jsonStart = response.indexOf('```') + 3;
        const jsonEnd = response.indexOf('```', jsonStart);
        jsonContent = response.substring(jsonStart, jsonEnd).trim();
      }

      const analysis = JSON.parse(jsonContent) as BlocksAnalysis;

      // Validate response structure
      this.validateBlocksAnalysis(analysis);

      this.logger.log(
        `Image analysis completed: blocks=${analysis.blocks.length}`,
      );

      return analysis;
    } catch (error) {
      this.logger.error(
        `Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        `Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
      );
    }
  }

  private validatePageAnalysis(
    analysis: any,
  ): asserts analysis is PageAnalysis {
    if (
      !analysis ||
      typeof analysis !== 'object' ||
      !('page_type' in analysis)
    ) {
      throw new Error('page_type is required');
    }
    if (
      !analysis.page_type ||
      !['question', 'theory', 'mixed'].includes(analysis.page_type)
    ) {
      throw new Error('Invalid page_type in response');
    }
    if (!Array.isArray(analysis.learning_points)) {
      throw new Error('learning_points must be an array');
    }
    if (!Array.isArray(analysis.exam_focus_points)) {
      throw new Error('exam_focus_points must be an array');
    }
    if (!Array.isArray(analysis.extracted_questions)) {
      throw new Error('extracted_questions must be an array');
    }
    if (!Array.isArray(analysis.generated_questions)) {
      throw new Error('generated_questions must be an array');
    }
  }

  private validateBlocksAnalysis(
    analysis: any,
  ): asserts analysis is BlocksAnalysis {
    if (
      !analysis ||
      typeof analysis !== 'object' ||
      !('blocks' in analysis) ||
      !Array.isArray(analysis.blocks)
    ) {
      throw new Error('blocks must be an array');
    }

    for (const block of analysis.blocks) {
      if (typeof block !== 'object' || block === null) {
        throw new Error('block must be an object');
      }
      if (
        !block.type ||
        !['TEXT', 'TABLE', 'ALGORITHM', 'SPOT'].includes(block.type)
      ) {
        throw new Error(`Invalid block type: ${block.type}`);
      }
      if (!block.short_title || typeof block.short_title !== 'string') {
        throw new Error('block short_title must be a string');
      }
      if (!block.content) {
        throw new Error('block content is required');
      }
    }
  }

  async analyzeImage(filePath: string): Promise<BlocksAnalysis> {
    try {
      this.logger.log(`Analyzing image: ${filePath}`);

      // Check if file exists

      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file
      const fileBuffer = await fs.readFile(filePath);
      const mimeType = this.getImageMimeType(filePath);

      return await this.analyzeImageBuffer(fileBuffer, mimeType);
    } catch (error) {
      this.logger.error(
        `Failed to analyze image ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
      );
    }
  }

  async analyzeImageFromBuffer(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<BlocksAnalysis> {
    return this.analyzeImageBuffer(imageBuffer, mimeType);
  }

  private async convertPDFPageToImage(
    pdfPath: string,
    pageNumber: number,
  ): Promise<Buffer> {
    throw new Error(
      'PDF processing is currently disabled. Please convert PDF to images manually and upload images instead.',
    );
    /* PDF processing disabled - pdf-poppler not compatible with Alpine Linux
    try {
      const tempDir = os.tmpdir();
      const timestamp = Date.now();
      const outputPrefix = `pdf-page-${timestamp}-${pageNumber}`;

      const options = {
        format: 'png',
        out_dir: tempDir,
        out_prefix: outputPrefix,
        page: pageNumber,
      };

      await pdf.convert(pdfPath, options);

      const outputPath = path.join(
        tempDir,
        `${outputPrefix}-${pageNumber}.png`,
      );
      const imageBuffer = await fs.readFile(outputPath);

      try {
        await fs.unlink(outputPath);
      } catch {
        // Ignore cleanup errors
      }

      return imageBuffer;
    } catch (error) {
      this.logger.error(
        `Failed to convert PDF page ${pageNumber} to image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
    */
  }

  async analyzePDF(filePath: string): Promise<BlocksAnalysis[]> {
    throw new Error(
      'PDF processing is currently disabled. Please convert PDF to images manually and upload images instead.',
    );
    /* PDF processing disabled - pdf-poppler not compatible with Alpine Linux
    try {
      this.logger.log(`Analyzing PDF: ${filePath}`);

      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      const tempDir = os.tmpdir();
      const timestamp = Date.now();
      const outputPrefix = `pdf-info-${timestamp}`;

      const options = {
        format: 'png',
        out_dir: tempDir,
        out_prefix: outputPrefix,
      };

      await pdf.convert(filePath, options);

      const files = await fs.readdir(tempDir);
      const pageFiles = files.filter(
        (f) => f.startsWith(outputPrefix) && f.endsWith('.png'),
      );
      const numPages = pageFiles.length;

      for (const file of pageFiles) {
        try {
          await fs.unlink(path.join(tempDir, file));
        } catch {
          // Ignore cleanup errors
        }
      }

      this.logger.log(`PDF has ${numPages} pages`);

      const analyses: BlocksAnalysis[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        this.logger.log(`Processing page ${pageNum}/${numPages}`);

        try {
          const imageBuffer = await this.convertPDFPageToImage(
            filePath,
            pageNum,
          );

          const analysis = await this.analyzeImageBuffer(
            imageBuffer,
            'image/png',
          );

          analyses.push(analysis);
        } catch (error) {
          this.logger.error(
            `Failed to analyze page ${pageNum}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      this.logger.log(
        `PDF analysis completed: ${analyses.length} pages analyzed`,
      );

      return analyses;
    } catch (error) {
      this.logger.error(
        `Failed to analyze PDF ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `PDF analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502,
      );
    }
    */
  }

  /**
   * Parse medical content from image using AI Router
   * Extracts content and classifies lesson/topic/subtopic (NOT content type)
   * @param filePath - Path to the image file
   * @param providerOverride - Optional provider override (OPENAI or GEMINI)
   * @param contextIds - Optional context IDs for tracking (batchId, pageId)
   */
  async parseMedicalContent(
    filePath: string,
    providerOverride?: string,
    contextIds?: { batchId?: string; pageId?: string },
  ): Promise<VisionParseResponse> {
    try {
      this.logger.log(`Parsing medical content: ${filePath}`);

      // Check file type
      const ext = path.extname(filePath).toLowerCase();
      if (['.pdf'].includes(ext)) {
        throw new Error('PDF parsing not yet implemented. Use image files.');
      }

      // Read and convert image
      const base64Image = await this.convertImageToBase64(filePath);
      const mimeType = this.getImageMimeType(filePath);

      // Use AI Router with optional provider override and context IDs
      const response = await this.aiRouter.runTask(
        AITaskType.VISION_PARSE,
        {
          imageBase64: base64Image,
          mimeType,
          ...(contextIds?.batchId && { batchId: contextIds.batchId }),
          ...(contextIds?.pageId && { pageId: contextIds.pageId }),
        },
        providerOverride as any,
      );

      // Extract JSON from response
      let jsonContent = response;
      if (response.includes('```json')) {
        const jsonStart = response.indexOf('```json') + 7;
        const jsonEnd = response.indexOf('```', jsonStart);
        jsonContent = response.substring(jsonStart, jsonEnd).trim();
      } else if (response.includes('```')) {
        const jsonStart = response.indexOf('```') + 3;
        const jsonEnd = response.indexOf('```', jsonStart);
        jsonContent = response.substring(jsonStart, jsonEnd).trim();
      }

      const parseResult = JSON.parse(jsonContent) as VisionParseResponse;

      // Validate response structure
      if (!parseResult.extracted_content || !parseResult.classification) {
        throw new Error('Invalid vision parse response structure');
      }

      this.logger.log(
        `Content parsed${providerOverride ? ` with provider ${providerOverride}` : ''}: ${parseResult.extracted_content.text_blocks.length} text blocks, lesson: ${parseResult.classification.lesson || 'N/A'}, topic: ${parseResult.classification.topic || 'N/A'}`,
      );

      return parseResult;
    } catch (error) {
      this.logger.error(
        `Failed to parse medical content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
