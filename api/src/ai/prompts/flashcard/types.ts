export interface FlashcardPromptPayload {
  statement: string;
  targetTypes?: string[];
  lesson?: string;
  topic?: string;
  subtopic?: string;
}

export interface FlashcardPromptResult {
  systemPrompt: string;
  userPrompt: string;
}
