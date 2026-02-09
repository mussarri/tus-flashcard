import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';
import { AIProviderType, ContentType } from '@prisma/client';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentTypeHint?: ContentType;

  @IsOptional()
  @IsEnum(AIProviderType)
  visionProvider?: AIProviderType;
}

export class UploadFilesDto {
  @IsArray()
  @IsNotEmpty()
  files: Express.Multer.File[];
}
