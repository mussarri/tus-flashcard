import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum ExtractionMode {
  APPEND = 'APPEND',
  REPLACE = 'REPLACE',
}

export class RunKnowledgeExtractionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  approvedContentId!: string;

  @IsEnum(ExtractionMode)
  mode!: ExtractionMode;
}

export class RunBatchKnowledgeExtractionDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  batchId!: string;

  @IsEnum(ExtractionMode)
  mode!: ExtractionMode;
}

export class KnowledgeExtractionStatusQueryDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  batchId!: string;
}

export class KnowledgeExtractionLogsQueryDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  batchId!: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
