import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VisionService } from './vision.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

@Controller('admin/vision')
export class VisionController {
  private readonly logger = new Logger(VisionController.name);

  constructor(private readonly visionService: VisionService) {}

  @Post('analyze-image')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeImage(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new HttpException('No file provided', 400);
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new HttpException(
          `Unsupported file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
          400,
        );
      }

      this.logger.log(`Received image upload: ${file.originalname}`);

      // Get mime type
      const mimeType = file.mimetype;

      // Analyze image directly from buffer
      const analysis = await this.visionService.analyzeImageFromBuffer(
        file.buffer,
        mimeType,
      );

      return { analysis };
    } catch (error) {
      this.logger.error(
        `Error in analyzeImage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('analyze-pdf')
  @UseInterceptors(FileInterceptor('file'))
  async analyzePDF(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new HttpException('No file provided', 400);
      }

      // Validate file type
      if (file.mimetype !== 'application/pdf') {
        throw new HttpException(
          `Unsupported file type: ${file.mimetype}. Expected: application/pdf`,
          400,
        );
      }

      this.logger.log(`Received PDF upload: ${file.originalname}`);

      // Save file temporarily (PDF needs to be saved to file for pdfjs-dist)
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(
        tempDir,
        `vision-${Date.now()}-${file.originalname}`,
      );

      await fs.writeFile(tempFilePath, file.buffer);

      try {
        // Analyze PDF
        const pages = await this.visionService.analyzePDF(tempFilePath);
        return { pages };
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempFilePath);
        } catch (error) {
          this.logger.warn(
            `Failed to delete temp file: ${tempFilePath}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in analyzePDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
