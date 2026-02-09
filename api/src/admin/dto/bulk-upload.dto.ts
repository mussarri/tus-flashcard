import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

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
  @IsString({ each: true })
  @IsNotEmpty()
  questionIds: string[];
}
