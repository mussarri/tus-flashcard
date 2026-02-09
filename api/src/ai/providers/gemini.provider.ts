/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AIProvider } from './ai-provider.interface';
import {
  VisionPayload,
  VisionResult,
  AIModelOptions,
  TextResult,
  TokenUsage,
} from '../types';
import { AIProviderType } from '@prisma/client';

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  readonly provider: AIProviderType = 'GEMINI';
  private readonly ai: GoogleGenAI | null;
  private readonly defaultModel: string;
  private readonly timeout = 120000; // 120 seconds

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.defaultModel = 'gemini-2.5-flash';

    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.logger.log(
        `Gemini provider initialized with default model: ${this.defaultModel}`,
      );
    } else {
      this.ai = null;
      this.logger.warn('Gemini API key not configured');
    }
  }

  async runVision(
    payload: VisionPayload,
    modelName: string,
  ): Promise<VisionResult> {
    if (!this.ai) {
      throw new Error('Gemini is not configured');
    }

    try {
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              data: payload.imageBase64,
              mimeType: payload.mimeType,
            },
          },
          payload.userPrompt || '',
        ],
        config: {
          systemInstruction: payload.systemPrompt,
          responseMimeType:
            payload.options?.responseFormat === 'json_object'
              ? 'application/json'
              : undefined,
          temperature: payload.options?.temperature ?? 0.1,
          maxOutputTokens: payload.options?.maxTokens,
        },
      });

      const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No response from Gemini');
      }

      // Extract token usage from Gemini response
      const usage: TokenUsage | undefined = response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount || 0,
            outputTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      return { content, usage };
    } catch (error) {
      this.logger.error(
        `Gemini vision call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async runText(
    systemPrompt: string,
    userPrompt: string,
    modelName: string,
    options?: AIModelOptions,
  ): Promise<TextResult> {
    if (!this.ai) {
      throw new Error('Gemini is not configured');
    }

    try {
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType:
            options?.responseFormat === 'json_object'
              ? 'application/json'
              : undefined,
          temperature: options?.temperature ?? 0.1,
          maxOutputTokens: options?.maxTokens,
        },
      });

      const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(content);

      if (!content) {
        throw new Error('No response from Gemini');
      }

      // Log first 200 chars for debugging
      this.logger.debug(
        `Gemini response preview: ${content.substring(0, 200)}...`,
      );

      // Extract token usage from Gemini response
      const usage: TokenUsage | undefined = response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount || 0,
            outputTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      return { content, usage };
    } catch (error) {
      this.logger.error(
        `Gemini text call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async runEmbedding(text: string, modelName: string): Promise<number[]> {
    if (!this.ai) {
      throw new Error('Gemini is not configured');
    }

    try {
      // Use text-embedding-004 or embedding-001 for embeddings
      let embeddingModel = modelName;
      if (!modelName.includes('embedding')) {
        embeddingModel = 'text-embedding-004'; // Default to text-embedding-004
      }

      const response = await this.ai.models.embedContent({
        model: embeddingModel,
        contents: [{ parts: [{ text }] }],
      });

      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      this.logger.error(
        `Gemini embedding call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
