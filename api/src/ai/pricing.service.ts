import { Injectable } from '@nestjs/common';
import { AIProviderType } from '@prisma/client';

/**
 * Pricing per 1M tokens (input/output)
 * Prices are in USD per million tokens
 * Based on OpenAI and Google pricing (standard) - update as needed
 */
interface ModelPricing {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

@Injectable()
export class PricingService {
  private readonly pricing: Map<string, ModelPricing> = new Map([
    // OpenAI Models
    ['gpt-4o', { inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 }],
    [
      'gpt-4o-2024-08-06',
      { inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
    ],
    [
      'gpt-4o-2024-11-20',
      { inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
    ],
    ['gpt-4o-mini', { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 }],
    ['gpt-4.1', { inputPricePerMillion: 2.0, outputPricePerMillion: 8.0 }],
    ['gpt-4.1-mini', { inputPricePerMillion: 0.4, outputPricePerMillion: 1.6 }],
    ['gpt-4.1-nano', { inputPricePerMillion: 0.1, outputPricePerMillion: 0.4 }],
    [
      'gpt-4-turbo',
      { inputPricePerMillion: 10.0, outputPricePerMillion: 30.0 },
    ],
    [
      'gpt-4-turbo-preview',
      { inputPricePerMillion: 10.0, outputPricePerMillion: 30.0 },
    ],
    [
      'gpt-4-0125-preview',
      { inputPricePerMillion: 10.0, outputPricePerMillion: 30.0 },
    ],
    [
      'gpt-4-1106-preview',
      { inputPricePerMillion: 10.0, outputPricePerMillion: 30.0 },
    ],
    ['gpt-4', { inputPricePerMillion: 30.0, outputPricePerMillion: 60.0 }],
    [
      'gpt-3.5-turbo',
      { inputPricePerMillion: 0.5, outputPricePerMillion: 1.5 },
    ],
    [
      'gpt-3.5-turbo-0125',
      { inputPricePerMillion: 0.5, outputPricePerMillion: 1.5 },
    ],
    [
      'gpt-3.5-turbo-1106',
      { inputPricePerMillion: 0.5, outputPricePerMillion: 1.5 },
    ],
    [
      'text-embedding-3-small',
      { inputPricePerMillion: 0.02, outputPricePerMillion: 0.0 },
    ],
    [
      'text-embedding-3-large',
      { inputPricePerMillion: 0.13, outputPricePerMillion: 0.0 },
    ],

    // Gemini Models
    // Gemini 3 series (2025)
    [
      'gemini-3-flash-preview',
      { inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 },
    ],
    [
      'gemini-3-pro-preview',
      { inputPricePerMillion: 1.0, outputPricePerMillion: 5.0 },
    ],
    // Gemini 2.5 series (2025)
    [
      'gemini-2.5-flash',
      { inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 },
    ],
    [
      'gemini-2.5-flash-lite',
      { inputPricePerMillion: 0.0375, outputPricePerMillion: 0.15 },
    ],
    [
      'gemini-2.5-pro',
      { inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
    ],
    // Legacy models (1.5 series)
    [
      'gemini-1.5-flash-002',
      { inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 },
    ],
    [
      'gemini-1.5-pro',
      { inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
    ],
    [
      'gemini-1.5-flash',
      { inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 },
    ],
    ['gemini-pro', { inputPricePerMillion: 0.5, outputPricePerMillion: 1.5 }],
    // Embedding models
    [
      'text-embedding-004',
      { inputPricePerMillion: 0.025, outputPricePerMillion: 0.0 },
    ],
  ]);

  /**
   * Calculate cost in USD for token usage
   */
  calculateCost(
    provider: AIProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number | null {
    const pricing = this.pricing.get(model);
    if (!pricing) {
      // Unknown model - return null to indicate pricing not available
      return null;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
    const outputCost =
      (outputTokens / 1_000_000) * pricing.outputPricePerMillion;

    return inputCost + outputCost;
  }

  /**
   * Get pricing info for a model (for debugging/admin)
   */
  getPricing(model: string): ModelPricing | null {
    return this.pricing.get(model) || null;
  }
}
