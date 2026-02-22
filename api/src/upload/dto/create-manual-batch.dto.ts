import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContentType, AIProviderType } from '@prisma/client';
import type { SplitStrategy } from '../text-split.util';

export enum DedupPolicy {
  REJECT_IF_DUPLICATE = 'REJECT_IF_DUPLICATE',
  ALLOW_DUPLICATE = 'ALLOW_DUPLICATE',
}

export class CreateManualBatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsString()
  @IsNotEmpty()
  topicId: string;

  @IsOptional()
  @IsString()
  subtopicId?: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentTypeHint?: ContentType;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  rawText: string;

  @IsOptional()
  @IsEnum(['LINES', 'BULLETS', 'PARAGRAPHS', 'AUTO'])
  splitStrategy?: SplitStrategy;

  @IsOptional()
  @IsEnum(DedupPolicy)
  dedupPolicy?: DedupPolicy;

  @IsOptional()
  @IsEnum(AIProviderType)
  visionProvider?: AIProviderType;
}
