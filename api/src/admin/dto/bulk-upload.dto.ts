import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
} from 'class-validator';

export class BulkUploadPreviewDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  lesson: string;
}

export class BulkUploadSaveDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  lesson: string;

  @IsInt()
  @IsNotEmpty()
  year: number;

  @IsString()
  @IsOptional()
  examType?: string;
}

export class BulkAnalyzeDto {
  @IsOptional()
  @IsString()
  mode?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  questionIds: string[];
}
