import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ConceptType, AliasLanguage } from '@prisma/client';

export class CreateConceptFromHintDto {
  @IsString()
  preferredLabel: string;

  @IsEnum(ConceptType)
  conceptType: ConceptType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AliasLanguage)
  aliasLanguage?: AliasLanguage;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  additionalAliases?: string[];
}
