import { buildKnowledgeExtractionPrompt } from './generic';
import { buildKnowledgeRepairPrompt } from './repair';
import {
  ContentKnowledgePromptPayload,
  ContentKnowledgePromptResult,
} from './types';

export function buildContentKnowledgePrompt(
  payload: ContentKnowledgePromptPayload,
): ContentKnowledgePromptResult {
  return payload.repairRawOutput
    ? buildKnowledgeRepairPrompt(payload)
    : buildKnowledgeExtractionPrompt(payload);
}
