import {
  VisionPayload,
  VisionResult,
  AIModelOptions,
  TextResult,
} from '../types';
import { AIProviderType } from '@prisma/client';

export interface AIProvider {
  provider: AIProviderType;

  runVision(payload: VisionPayload, model: string): Promise<VisionResult>;

  runText(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    options?: AIModelOptions,
  ): Promise<TextResult>;

  runEmbedding(text: string, model: string): Promise<number[]>;
}
