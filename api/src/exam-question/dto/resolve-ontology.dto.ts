import { IsOptional, IsString, IsArray } from 'class-validator';

export class ResolveOntologyDto {
  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  subtopicId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conceptIds?: string[];

  @IsOptional()
  @IsString()
  action?: 'APPROVE_AS_IS' | 'REJECT_SUGGESTIONS' | 'RESOLVE';
}

export class CreateOntologyEntityDto {
  @IsString()
  name: string;

  @IsString()
  entityType: 'TOPIC' | 'SUBTOPIC' | 'CONCEPT';

  @IsOptional()
  @IsString()
  lesson?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  subtopicId?: string;
}

export class UnmatchedOntologyQueryDto {
  @IsOptional()
  @IsString()
  lesson?: string;

  @IsOptional()
  minOccurrences?: number;
}
