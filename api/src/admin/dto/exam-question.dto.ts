import {
  IsString,
  IsInt,
  IsOptional,
  IsObject,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnalysisStatus } from '@prisma/client';

export class CreateExamQuestionDto {
  @IsInt()
  year: number;

  @IsOptional()
  @IsString()
  examType?: string;

  @IsOptional()
  @IsInt()
  questionNumber?: number;

  @IsString()
  question: string;

  @IsObject()
  options: Record<string, string>; // { A: "...", B: "...", C: "...", D: "...", E: "..." }

  @IsEnum(['A', 'B', 'C', 'D', 'E'])
  correctAnswer: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  subtopicId?: string;
}

export class UpdateExamQuestionDto {
  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  examType?: string;

  @IsOptional()
  @IsInt()
  questionNumber?: number;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, string>;

  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D', 'E'])
  correctAnswer?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  subtopicId?: string;

  @IsOptional()
  @IsArray()
  traps?: Array<{ option: string; reason: string; confusion: string }>;
}

export class ExamQuestionListQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsString()
  examType?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsEnum(AnalysisStatus)
  analysisStatus?: AnalysisStatus;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(['year', 'createdAt', 'updatedAt', 'questionNumber'])
  sortBy?: 'year' | 'createdAt' | 'updatedAt' | 'questionNumber';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  createdAfter?: string; // ISO date string

  @IsOptional()
  @IsString()
  createdBefore?: string; // ISO date string

  @IsOptional()
  @IsString()
  updatedAfter?: string; // ISO date string

  @IsOptional()
  @IsString()
  updatedBefore?: string; // ISO date string

  @IsOptional()
  @IsString()
  hasKnowledgePoints?: string; // 'true' | 'false' | undefined (query params are strings)
}

export class LinkKnowledgePointDto {
  @IsString()
  knowledgePointId: string;

  @IsEnum(['MEASURED', 'TRAP', 'CONTEXT'])
  relationshipType: 'MEASURED' | 'TRAP' | 'CONTEXT';
}

export class BulkParseDto {
  @IsString()
  text: string;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedQuestionDto)
  questions: ParsedQuestionDto[];
}

export class ParsedQuestionDto {
  @IsString()
  questionText: string;

  @IsObject()
  options: Record<string, string>;

  @IsEnum(['A', 'B', 'C', 'D', 'E'])
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  examType?: string;

  @IsOptional()
  @IsInt()
  questionNumber?: number;

  @IsOptional()
  @IsString()
  explanation?: string;
}
