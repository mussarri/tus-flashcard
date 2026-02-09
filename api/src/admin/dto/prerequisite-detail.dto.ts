import { IsOptional, IsBoolean, IsInt, Min, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class PrerequisiteDetailQueryDto {
  @IsOptional()
  @IsString()
  lesson?: string = 'Anatomi';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeEvidence?: boolean = false;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : (value as number),
  )
  @IsInt()
  @Min(1)
  evidenceLimit?: number = 10;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value, 10) : (value as number),
  )
  @IsInt()
  @Min(0)
  evidenceOffset?: number = 0;
}

// Response DTOs
export class ConceptBindingDto {
  conceptId: string;
  preferredLabel: string;
  conceptType: string;
  status: string;
}

export class TopicCoverageDto {
  topicName: string;
  subtopic: string | null;
  frequency: number;
  strength: string; // WEAK | MEDIUM | STRONG
}

export class ExamImpactMetricsDto {
  examImportance: number; // percentage
  totalFrequency: number;
  maxStrength: string;
  rank?: number; // optional rank among all prerequisites
}

export class PatternContextDto {
  patternType: string;
  count: number;
}

export class SourceEvidenceDto {
  questionId: string;
  year: number;
  topic: string | null;
  subtopic: string | null;
  patternType: string | null;
}

export class MergeCandidateDto {
  prerequisiteId: string;
  name: string;
  similarityScore: number;
  reasons: string[];
}

export class PrerequisiteDetailResponseDto {
  // 1. Core
  id: string;
  name: string;
  canonicalKey: string | null;
  createdAt: Date;
  updatedAt: Date;

  // 2. Concept Binding
  linkedConcepts: ConceptBindingDto[];
  isConceptLess: boolean;

  // 3. Topic & Subtopic Coverage
  topicCoverage: TopicCoverageDto[];
  totalFrequency: number;
  maxStrength: string;

  // 4. Exam Impact Metrics
  examMetrics: ExamImpactMetricsDto;

  // 5. Pattern Context
  patternContext: PatternContextDto[];

  // 6. Source Evidence (optional/paginated)
  sourceEvidence?: {
    questions: SourceEvidenceDto[];
    total: number;
  };

  // 7. Merge Candidates
  mergeCandidates: MergeCandidateDto[];
}
