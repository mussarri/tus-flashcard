import { IsString, IsEnum, IsOptional } from 'class-validator';
import { AliasLanguage, AliasSource } from '@prisma/client';

export class AddAliasDto {
  @IsString()
  alias: string;

  @IsEnum(AliasLanguage)
  @IsOptional()
  language?: AliasLanguage;

  @IsEnum(AliasSource)
  @IsOptional()
  source?: AliasSource;
}
