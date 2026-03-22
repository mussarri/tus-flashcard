import {
  buildLessonSingleCallPrompt,
  LessonSingleCallPayload,
} from './question-analyze-and-kp.shared.prompt';

export function buildAnatomiSingleCallPrompt(
  payload: LessonSingleCallPayload,
): { systemPrompt: string; userPrompt: string } {
  // TODO: Replace with Anatomi-specific single-call prompt implementation.
  return buildLessonSingleCallPrompt(payload, {
    lessonName: 'Anatomi',
    promptVersion: 'anatomi-v1',
  });
}
