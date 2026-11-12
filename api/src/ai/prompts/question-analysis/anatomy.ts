import { buildLessonSingleCallPrompt } from './shared';
import { LessonSingleCallPayload } from './types';

export function buildAnatomiSingleCallPrompt(
  payload: LessonSingleCallPayload,
): { systemPrompt: string; userPrompt: string } {
  // TODO: Replace with Anatomi-specific single-call prompt implementation.
  return buildLessonSingleCallPrompt(payload, {
    lessonName: 'Anatomi',
    promptVersion: 'anatomi-v1',
  });
}
