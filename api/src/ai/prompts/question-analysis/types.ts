export interface LessonSingleCallPayload {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  year?: number;
  lesson: string;
  topic?: string;
  subtopic?: string;
  repairRawOutput?: string;
}

export interface PromptResult {
  systemPrompt: string;
  userPrompt: string;
}
