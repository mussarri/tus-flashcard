// Re-export Prisma enums for convenience
export { AITaskType, AIProviderType } from '@prisma/client';

export interface AIModelOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface VisionPayload {
  imageBase64: string;
  mimeType: string;
  systemPrompt: string;
  userPrompt?: string;
  options?: AIModelOptions;
}

export interface VisionResult {
  content: string;
  usage?: TokenUsage;
}

export interface TextPayload {
  systemPrompt: string;
  userPrompt: string;
  options?: AIModelOptions;
}

export interface TextResult {
  content: string;
  usage?: TokenUsage;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EmbeddingPayload {
  text: string;
}

export interface EmbeddingResult {
  embedding: number[];
}
