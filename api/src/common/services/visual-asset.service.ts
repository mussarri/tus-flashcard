import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parseSVGRegions } from '../utils/svg-parser.util';

export interface UploadedVisualAsset {
  id: string;
  filePath: string;
  mimeType: string;
  originalName: string;
  parsedRegions?: string[];
}

@Injectable()
export class VisualAssetService {
  private readonly logger = new Logger(VisualAssetService.name);
  private readonly assetsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.assetsDir =
      this.configService.get<string>('VISUAL_ASSETS_DIR') || './uploads/visual-assets';
    this.ensureAssetsDirectory();
  }

  private async ensureAssetsDirectory() {
    try {
      await fs.mkdir(this.assetsDir, { recursive: true });
      this.logger.log(`Visual assets directory ensured: ${this.assetsDir}`);
    } catch (error) {
      this.logger.error(
        `Failed to create visual assets directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Save uploaded visual file and return asset info
   */
  async saveVisualAsset(
    file: Express.Multer.File,
  ): Promise<UploadedVisualAsset> {
    try {
      // Validate file type
      const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
        );
      }

      // Generate unique ID
      const assetId = uuidv4();
      const extension = path.extname(file.originalname) || this.getExtensionFromMimeType(file.mimetype);
      const fileName = `${assetId}${extension}`;
      const filePath = path.join(this.assetsDir, fileName);

      // Save file
      await fs.writeFile(filePath, file.buffer);

      this.logger.log(`Visual asset saved: ${assetId} at ${filePath}`);

      // Parse SVG regions if SVG
      let parsedRegions: string[] | undefined;
      if (file.mimetype === 'image/svg+xml') {
        try {
          parsedRegions = await parseSVGRegions(file.buffer);
          this.logger.log(
            `Parsed ${parsedRegions.length} regions from SVG: ${assetId}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to parse SVG regions for ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Continue without regions
        }
      }

      return {
        id: assetId,
        filePath,
        mimeType: file.mimetype,
        originalName: file.originalname,
        parsedRegions,
      };
    } catch (error) {
      this.logger.error(
        `Failed to save visual asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get visual asset file path
   */
  async getVisualAssetPath(assetId: string): Promise<string | null> {
    try {
      const files = await fs.readdir(this.assetsDir);
      const file = files.find((f) => f.startsWith(assetId));
      if (file) {
        return path.join(this.assetsDir, file);
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get visual asset path for ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Delete visual asset
   */
  async deleteVisualAsset(assetId: string): Promise<void> {
    try {
      const filePath = await this.getVisualAssetPath(assetId);
      if (filePath) {
        await fs.unlink(filePath);
        this.logger.log(`Visual asset deleted: ${assetId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete visual asset ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/svg+xml': '.svg',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
    };
    return map[mimeType] || '.bin';
  }
}
