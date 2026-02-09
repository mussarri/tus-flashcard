import { IsArray, IsString, IsOptional, ArrayMinSize, IsUUID } from 'class-validator';

export class MergePrerequisiteDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  selectedPrerequisiteIds: string[]; // At least 2 IDs

  @IsOptional()
  @IsString()
  canonicalName?: string; // If admin provides new name

  @IsOptional()
  @IsUUID('4')
  canonicalPrerequisiteId?: string; // If admin selects existing one
}

export class MergePreviewDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  selectedPrerequisiteIds: string[];
}
