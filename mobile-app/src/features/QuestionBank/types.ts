export type QuestionOptionId = 'A' | 'B' | 'C' | 'D' | 'E';

export type SourceType = 'EXAM_REPLICA' | 'AI_GENERATED' | 'MIXED' | 'ERROR_BASED';

export interface Lesson {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  // UI-specific extensions (may need to be mapped locally until backend supports them)
  category?: 'BASIC' | 'CLINICAL';
  icon?: string;
  questionCount?: number;
  topics?: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  displayName?: string;
  lessonId?: string; // Made optional to match schema, though practically usually present
  questionCount?: number;
  status?: 'ACTIVE' | 'MERGED' | 'ARCHIVED';
}

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
}

export interface OptionsMetadata {
  A?: { wouldBeCorrectIf?: string };
  B?: { wouldBeCorrectIf?: string };
  C?: { wouldBeCorrectIf?: string };
  D?: { wouldBeCorrectIf?: string };
  E?: { wouldBeCorrectIf?: string };
}

export interface SpatialContext {
  anatomySubject: string;
  spatialRelation: string;
  relatedStructure: string;
}

export interface ExamTrap {
  confusedWith?: string;
  keyDifference?: string;
}

export interface QuestionCard {
  id: string;
  question: string;
  options: QuestionOptions;
  correctAnswer?: QuestionOptionId; // Optional on fetch, present on result
  difficulty: 'easy' | 'medium' | 'hard';
  patternType?: string;
  sourceType?: 'ADMIN' | 'EXAM_REPLICA' | 'AI_GENERATION' | 'ERROR_BASED';
  lessonId: string;
  topicId: string;
  subtopicId: string;
  mainExplanation?: string;
  optionsMetadata?: OptionsMetadata;
  clinicalCorrelation?: string;
  spatialContexts?: SpatialContext[];
  examTrap?: ExamTrap;
}

export interface QuestionFilter {
  lessonId?: string;
  topicId?: string;
  subtopicId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  sourceType?: SourceType; // Note: EXAM_REPLICA excluded from adaptive feed
  limit?: number;
}

export interface SubmitAnswerRequest {
  selectedOption: QuestionOptionId;
  durationMs: number;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctOption: QuestionOptionId;
  mainExplanation: string;
  optionsMetadata: OptionsMetadata;
  examTrap?: ExamTrap;
  clinicalCorrelation?: string;
  spatialContexts?: SpatialContext[];
  remediation?: {
    prerequisiteIds?: string[];
    knowledgePointIds?: string[];
  };
}

export interface QuestionSessionSummary {
  totalQuestions: number;
  correctCount: number;
  timeSpentMs: number;
  streak: number;
}
