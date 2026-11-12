import { NotFoundException } from '@nestjs/common';
import { buildAnatomiSingleCallPrompt } from './anatomy';
import { buildDahiliyeSingleCallPrompt } from './dahililye';
import { buildPatolojiSingleCallPrompt } from './pathology';
import { buildFizyolojiSingleCallPrompt } from './physiology';
import { LessonSingleCallPayload, PromptResult } from './types';

const builders: Record<
  string,
  (payload: LessonSingleCallPayload) => PromptResult
> = {
  anatomi: buildAnatomiSingleCallPrompt,
  fizyoloji: buildFizyolojiSingleCallPrompt,
  dahiliye: buildDahiliyeSingleCallPrompt,
  patoloji: buildPatolojiSingleCallPrompt,
};

export function buildQuestionAnalysisPrompt(
  payload: LessonSingleCallPayload,
): PromptResult {
  const lesson = payload.lesson?.toLowerCase().trim();
  const builder = builders[lesson];
  if (!builder) {
    throw new NotFoundException(
      `No single-call analysis prompt found for lesson: ${payload.lesson}. Supported lessons: Anatomi, Fizyoloji, Dahiliye, Patoloji.`,
    );
  }
  return builder(payload);
}
