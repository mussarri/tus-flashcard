import { BlockType } from '@prisma/client';

export type TableType =
  | 'DIRECT_FACT'
  | 'DIAGNOSTIC_CRITERIA'
  | 'COMPARISON'
  | 'ENUMERATION'
  | 'MECHANISM_FLOW'
  | 'MIXED_OR_UNKNOWN';

export type CandidateKind = 'ATOMIC' | 'PATTERN' | 'ROW' | 'CELL' | 'STEP';

export interface GeneratedKnowledgePointCandidate {
  fact: string;
  priority: number;
  examRelevance: number;
  classificationConfidence: number;
  kind?: CandidateKind;
}

export interface ApprovedContentGenerationInput {
  approvedContentId: string;
  content: string;
  blockType: BlockType;
  lessonName?: string;
  topicName?: string;
  subtopicName?: string;
  tableData?: unknown;
  algorithmData?: unknown;
  maxKnowledgePoints?: number;
}
