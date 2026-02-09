import { IsString, IsOptional } from 'class-validator';

export class ApproveBlockDto {
  @IsString()
  @IsOptional()
  editedText?: string;
}

export class RejectBlockDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
