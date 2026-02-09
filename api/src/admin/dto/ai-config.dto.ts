import { IsEnum, IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { AITaskType, AIProviderType } from '@prisma/client';

export class UpdateAITaskConfigDto {
  @IsOptional()
  @IsEnum(AIProviderType)
  provider?: AIProviderType;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
