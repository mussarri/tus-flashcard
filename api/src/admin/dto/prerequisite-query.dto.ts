import { IsOptional, IsInt, Min, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PrerequisiteQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALL', 'STRONG', 'MEDIUM', 'WEAK'])
  strengthFilter?: 'ALL' | 'STRONG' | 'MEDIUM' | 'WEAK';

  @IsOptional()
  @IsIn(['ALL', 'ACTIVE', 'NEEDS_REVIEW', 'DEPRECATED'])
  statusFilter?: 'ALL' | 'ACTIVE' | 'NEEDS_REVIEW' | 'DEPRECATED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFrequency?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['name', 'edges', 'concepts', 'date'])
  sortBy?: 'name' | 'edges' | 'concepts' | 'date';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
