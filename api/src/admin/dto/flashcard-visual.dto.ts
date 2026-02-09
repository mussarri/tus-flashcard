import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum VisualRequirement {
  IMAGE_OCCLUSION = 'IMAGE_OCCLUSION',
  SCHEMATIC = 'SCHEMATIC',
}

export enum VisualContext {
  SKULL_BASE = 'SKULL_BASE',
  ORBIT = 'ORBIT',
  FOOT = 'FOOT',
  AXILLA = 'AXILLA',
  PELVIS = 'PELVIS',
  BRACHIAL_PLEXUS = 'BRACHIAL_PLEXUS',
  OTHER = 'OTHER',
}

export enum VisualStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  REQUIRED = 'REQUIRED',
  UPLOADED = 'UPLOADED',
}

export class FlashcardListQueryDto {
  @IsOptional()
  @IsEnum(VisualStatus)
  visualStatus?: VisualStatus;

  @IsOptional()
  @IsBoolean()
  useVisual?: boolean;

  @IsOptional()
  @IsEnum(VisualRequirement)
  visualRequirement?: VisualRequirement;

  @IsOptional()
  @IsEnum(VisualContext)
  visualContext?: VisualContext;

  @IsOptional()
  @IsString()
  lesson?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  approvalStatus?: string;

  @IsOptional()
  @IsString()
  cardType?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string; // 'createdAt', 'cardType', 'approvalStatus'

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class BindVisualDto {
  @IsString()
  imageAssetId: string;

  @IsOptional()
  @IsString()
  highlightRegion?: string;
}
