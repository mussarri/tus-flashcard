import { IsEnum, IsOptional } from 'class-validator';
import { AIProviderType } from '@prisma/client';

export enum GenerationMode {
  APPEND = 'append',
  REPLACE = 'replace',
}

export class GenerateTopicDto {
  @IsOptional()
  @IsEnum(GenerationMode)
  mode?: GenerationMode;

  @IsOptional()
  @IsEnum(AIProviderType)
  provider?: AIProviderType;
}
