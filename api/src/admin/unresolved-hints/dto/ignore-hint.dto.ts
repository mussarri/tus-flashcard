import { IsOptional, IsString } from 'class-validator';

export class IgnoreHintDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
