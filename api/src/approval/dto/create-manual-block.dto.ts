import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateManualBlockDto {
  @IsString()
  pageId: string;

  @IsString()
  rawText: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsString()
  @IsOptional()
  lesson?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  subtopic?: string;
}
