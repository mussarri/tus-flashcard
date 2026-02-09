import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ConceptType } from '@prisma/client';

export class CreateConceptDto {
  @IsString()
  preferredLabel: string;

  @IsEnum(ConceptType)
  @IsOptional()
  conceptType?: ConceptType;

  @IsString()
  @IsOptional()
  description?: string;
}
