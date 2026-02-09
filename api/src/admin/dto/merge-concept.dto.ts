import { IsNotEmpty, IsUUID } from 'class-validator';

export class MergeConceptDto {
  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsUUID()
  @IsNotEmpty()
  topicId: string;

  @IsUUID()
  @IsNotEmpty()
  subtopicId: string;

  @IsUUID()
  @IsNotEmpty()
  sourceConceptId: string;

  @IsUUID()
  @IsNotEmpty()
  targetConceptId: string;
}
