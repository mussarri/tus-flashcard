export interface GeneratedQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  scenarioType?: string;
  approvalStatus: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  lesson?: {
    id: string;
    name: string;
  };
  topic?: {
    id: string;
    name: string;
  };
  subtopic?: {
    id: string;
    name: string;
  };
  prerequisite?: {
    id: string;
    name: string;
  };
  questionKnowledgePoints?: Array<{
    knowledgePoint: {
      id: string;
      fact: string;
    };
  }>;
  sourceExamQuestionId?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface EditState {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
}
