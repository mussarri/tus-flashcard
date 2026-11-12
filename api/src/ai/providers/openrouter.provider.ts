import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderType } from '@prisma/client';

import { AIProvider } from './ai-provider.interface';
import {
  AIModelOptions,
  TextResult,
  TokenUsage,
  VisionPayload,
  VisionResult,
} from '../types';

interface OpenRouterResponse {
  status?: string;
  error?: { message?: string };
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}

@Injectable()
export class OpenRouterProvider implements AIProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);
  readonly provider: AIProviderType = 'OPENROUTER';
  private readonly apiKey?: string;
  private readonly siteUrl?: string;
  private readonly appTitle?: string;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('OPENROUTER_API_KEY');
    this.siteUrl = configService.get<string>('OPENROUTER_SITE_URL');
    this.appTitle = configService.get<string>('OPENROUTER_APP_TITLE');
    if (!this.apiKey) {
      this.logger.warn('OPENROUTER_API_KEY is not configured');
    }
  }

  async runText(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    options?: AIModelOptions,
  ): Promise<TextResult> {
    return this.createResponse({
      model,
      instructions: systemPrompt,
      input: userPrompt,
      max_output_tokens: options?.maxTokens || 20000,
      ...(!model.startsWith('~openai/gpt-sol-')
        ? { temperature: options?.temperature ?? 0.1 }
        : {}),
      ...(options?.responseFormat === 'json_object'
        ? { text: { format: { type: 'json_object' } } }
        : {}),
    });
  }

  async runVision(
    payload: VisionPayload,
    model: string,
  ): Promise<VisionResult> {
    return this.createResponse({
      model,
      instructions: payload.systemPrompt,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: payload.userPrompt || '' },
            {
              type: 'input_image',
              image_url: `data:${payload.mimeType};base64,${payload.imageBase64}`,
            },
          ],
        },
      ],
      max_output_tokens: payload.options?.maxTokens || 4000,
      ...(!model.startsWith('~openai/gpt-sol-')
        ? { temperature: payload.options?.temperature ?? 0.1 }
        : {}),
      ...(payload.options?.responseFormat === 'json_object'
        ? { text: { format: { type: 'json_object' } } }
        : {}),
    });
  }

  async runEmbedding(text: string, model: string): Promise<number[]> {
    const response = await this.post<{
      data?: Array<{ embedding?: number[] }>;
    }>('/embeddings', { model, input: text });
    const embedding = response.data?.[0]?.embedding;
    if (!embedding?.length) {
      throw new Error('OpenRouter returned no embedding');
    }
    return embedding;
  }

  private async createResponse(
    body: Record<string, unknown>,
  ): Promise<TextResult> {
    const response = await this.post<OpenRouterResponse>('/responses', body);
    if (response.status !== 'completed') {
      throw new Error(
        response.error?.message ??
          `OpenRouter response ended as ${response.status ?? 'unknown'}`,
      );
    }
    const content =
      response.output_text ||
      response.output
        ?.filter((item) => item.type === 'message')
        .flatMap((item) => item.content ?? [])
        .filter((part) => part.type === 'output_text')
        .map((part) => part.text ?? '')
        .join('');
    if (!content) {
      throw new Error('OpenRouter returned no text');
    }
    const usage: TokenUsage | undefined = response.usage
      ? {
          inputTokens: response.usage.input_tokens ?? 0,
          outputTokens: response.usage.output_tokens ?? 0,
          totalTokens: response.usage.total_tokens ?? 0,
          costUSD: response.usage.cost,
        }
      : undefined;
    return { content, usage };
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    const response = await fetch(`https://openrouter.ai/api/v1${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.siteUrl ? { 'HTTP-Referer': this.siteUrl } : {}),
        ...(this.appTitle ? { 'X-OpenRouter-Title': this.appTitle } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const error = data as { error?: { message?: string } };
      throw new Error(
        `OpenRouter ${response.status}: ${error.error?.message ?? response.statusText}`,
      );
    }
    return data as T;
  }
}
