import { IsNotEmpty, IsUUID } from 'class-validator';

export class MergeSubtopicDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsUUID()
  @IsNotEmpty()
  topicId: string;

  @IsUUID()
  @IsNotEmpty()
  sourceSubtopicId: string;

  @IsUUID()
  @IsNotEmpty()
  targetSubtopicId: string;
}
