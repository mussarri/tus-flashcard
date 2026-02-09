import { IsEnum, IsArray, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ExtractedQuestionDto {
  @IsString()
  stem: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsString()
  concept: string;
}

export class GeneratedQuestionDto {
  @IsString()
  stem: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  answer_index: number;
}

export class PageAnalysisDto {
  @IsEnum(['question', 'theory', 'mixed'])
  page_type: 'question' | 'theory' | 'mixed';

  @IsArray()
  @IsString({ each: true })
  learning_points: string[];

  @IsArray()
  @IsString({ each: true })
  exam_focus_points: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedQuestionDto)
  extracted_questions: ExtractedQuestionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedQuestionDto)
  generated_questions: GeneratedQuestionDto[];
}

export class ImageAnalysisResponseDto {
  @ValidateNested()
  @Type(() => PageAnalysisDto)
  analysis: PageAnalysisDto;
}

export class PDFAnalysisResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageAnalysisDto)
  pages: PageAnalysisDto[];
}
