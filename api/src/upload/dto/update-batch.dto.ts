import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateBatchDto {
  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  lessonId?: string;

  @IsUUID()
  @IsOptional()
  topicId?: string;
}
