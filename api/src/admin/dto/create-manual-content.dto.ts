import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, IsUUID } from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateManualContentDto {
  @IsUUID()
  @IsNotEmpty()
  topicId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  contentType: ContentType;

  @IsString()
  @IsNotEmpty()
  @MinLength(50, { message: 'Text content must be at least 50 characters' })
  textContent: string;
}
