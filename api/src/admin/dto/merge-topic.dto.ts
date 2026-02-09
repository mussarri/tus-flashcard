import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MergeTopicDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsUUID()
  @IsNotEmpty()
  sourceTopicId: string;

  @IsUUID()
  @IsNotEmpty()
  targetTopicId: string;
}
