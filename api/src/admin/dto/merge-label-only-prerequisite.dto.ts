import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, ArrayMinSize } from 'class-validator';

/**
 * DTO for merging/upgrading a LABEL_ONLY prerequisite to CONCEPT-BACKED
 */
export class MergeLabelOnlyPrerequisiteDto {
  @IsUUID()
  @IsNotEmpty()
  prerequisiteId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  conceptIds: string[];

  @IsOptional()
  @IsString()
  adminLabel?: string;
}
