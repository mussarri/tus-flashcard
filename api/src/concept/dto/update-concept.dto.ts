import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ConceptType, ConceptStatus } from '@prisma/client';

export class UpdateConceptDto {
  @IsString()
  @IsOptional()
  preferredLabel?: string;

  @IsEnum(ConceptType)
  @IsOptional()
  conceptType?: ConceptType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ConceptStatus)
  @IsOptional()
  status?: ConceptStatus;
}
