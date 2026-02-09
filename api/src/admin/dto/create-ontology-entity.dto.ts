import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export enum OntologyEntityType {
  TOPIC = 'TOPIC',
  SUBTOPIC = 'SUBTOPIC',
  CONCEPT = 'CONCEPT',
}

export class CreateOntologyEntityDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEnum(OntologyEntityType)
  @IsNotEmpty()
  entityType: OntologyEntityType;

  @IsUUID()
  @IsNotEmpty()
  lessonId: string;

  @IsUUID()
  @IsOptional()
  topicId?: string;

  @IsUUID()
  @IsOptional()
  subtopicId?: string;
}
