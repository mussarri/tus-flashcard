import { buildLessonSingleCallPrompt } from './shared';
import { LessonSingleCallPayload } from './types';

export function buildDahiliyeSingleCallPrompt(
  payload: LessonSingleCallPayload,
): { systemPrompt: string; userPrompt: string } {
  // TODO: Replace with Dahiliye-specific single-call prompt implementation.
  return buildLessonSingleCallPrompt(payload, {
    lessonName: 'Dahiliye',
    promptVersion: 'dahiliye-v1',
  });
}
