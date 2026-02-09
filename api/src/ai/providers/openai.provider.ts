import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  readonly provider: AIProviderType = 'OPENAI';
  private readonly openai: OpenAI;
  private readonly timeout = 120000; // 120 seconds

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.openai = new OpenAI({
      apiKey,
      timeout: this.timeout,
    });

    this.logger.log('OpenAI provider initialized');
  }

  async runVision(
    payload: VisionPayload,
    modelName: string,
  ): Promise<VisionResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: payload.systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${payload.mimeType};base64,${payload.imageBase64}`,
                },
              },
              {
                type: 'text',
                text: payload.userPrompt || '',
              },
            ],
          },
        ],
        max_tokens: payload.options?.maxTokens || 4000,
        temperature: payload.options?.temperature ?? 0.1,
        response_format:
          payload.options?.responseFormat === 'json_object'
            ? { type: 'json_object' }
            : undefined,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract token usage
      const usage: TokenUsage | undefined = response.usage
        ? {
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : undefined;

      return { content, usage };
    } catch (error) {
      this.logger.error(
        `OpenAI vision call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    try {
      const response = await this.openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        max_tokens: options?.maxTokens || 4000,
        temperature: options?.temperature ?? 0.1,
        response_format:
          options?.responseFormat === 'json_object'
            ? { type: 'json_object' }
            : undefined,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Extract token usage
      const usage: TokenUsage | undefined = response.usage
        ? {
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : undefined;

      return { content, usage };
    } catch (error) {
      this.logger.error(
        `OpenAI text call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async runEmbedding(text: string, modelName: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: modelName,
        input: text,
      });

      // Note: Embedding API doesn't return usage in the same format
      // Token usage for embeddings is typically just input tokens
      // We could log this separately if needed, but for now embeddings
      // don't go through the token tracking system

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(
        `OpenAI embedding call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
