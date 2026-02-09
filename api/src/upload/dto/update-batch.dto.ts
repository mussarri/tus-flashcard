import { IsOptional, IsString } from 'class-validator';

export class UpdateBatchDto {
  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
