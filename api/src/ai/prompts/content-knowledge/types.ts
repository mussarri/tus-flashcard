export interface ContentKnowledgePromptPayload {
  content?: string;
  lesson?: string;
  maxKnowledgePoints?: number;
  strategyHint?: string;
  repairRawOutput?: string;
}

export interface ContentKnowledgePromptResult {
  systemPrompt: string;
  userPrompt: string;
}
