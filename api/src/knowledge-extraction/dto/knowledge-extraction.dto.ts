import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsInt,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  ValidateNested,
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

export class ManualKnowledgePointDto {
  @IsString()
  @IsNotEmpty()
  fact!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  examRelevance!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  classificationConfidence!: number;
}

export class SaveKnowledgePointsDto {
  @IsString()
  @IsNotEmpty()
  lesson!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualKnowledgePointDto)
  knowledgePoints!: ManualKnowledgePointDto[];
}
