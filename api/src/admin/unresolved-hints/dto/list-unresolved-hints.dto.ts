import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UnresolvedHintStatus } from '@prisma/client';

export class ListUnresolvedHintsDto {
  @IsOptional()
  @IsEnum(UnresolvedHintStatus)
  status?: UnresolvedHintStatus;

  @IsOptional()
  @IsString()
  lesson?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsEnum(['count', 'createdAt'])
  sortBy?: 'count' | 'createdAt' = 'count';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
