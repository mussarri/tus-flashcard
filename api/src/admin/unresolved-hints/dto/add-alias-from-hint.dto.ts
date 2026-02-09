import { IsString, IsEnum, IsOptional } from 'class-validator';
import { AliasLanguage } from '@prisma/client';

export class AddAliasFromHintDto {
  @IsString()
  conceptId: string;

  @IsOptional()
  @IsEnum(AliasLanguage)
  aliasLanguage?: AliasLanguage;
}
