import { buildAnatomyFlashcardPrompt } from './anatomy';
import { buildPhysiologyGenericFlashcardPrompt } from './physiology';
import { buildPathologyGenericFlashcardPrompt } from './pathology';
import { FlashcardPromptPayload, FlashcardPromptResult } from './types';
import { buildBiochemistryGenericFlashcardPrompt } from './biyokimya';
import { buildPharmacologyGenericFlashcardPrompt } from './farmakoloji';
import { buildMicrobiologyGenericFlashcardPrompt } from './mikrobiyoloji';
import { buildHistologyGenericFlashcardPrompt } from './histoloji';

/**
 * Build flashcard prompt based on lesson
 * Routes to lesson-specific prompt builders
 */
export function buildFlashcardPrompt(
  payload: FlashcardPromptPayload,
): FlashcardPromptResult {
  const lessonName = payload.lesson?.toLowerCase().trim();

  // Route to lesson-specific prompt builders
  switch (lessonName) {
    case 'anatomi':
    case 'anatomy':
      return buildAnatomyFlashcardPrompt(payload);

    case 'fizyoloji':
    case 'physiology':
      return buildPhysiologyGenericFlashcardPrompt(payload);

    case 'biyokimya':
    case 'biochemistry':
      // TODO: Create buildBiyokimyaFlashcardPrompt
      return buildBiochemistryGenericFlashcardPrompt(payload);

    case 'mikrobiyoloji':
    case 'microbiology':
      // TODO: Create buildMikrobiyolojiFlashcardPrompt
      return buildMicrobiologyGenericFlashcardPrompt(payload);

    case 'patoloji':
    case 'pathology':
      // TODO: Create buildPatolojiFlashcardPrompt
      return buildPathologyGenericFlashcardPrompt(payload);

    case 'farmakoloji':
    case 'pharmacology':
      // TODO: Create buildFarmakolojiFlashcardPrompt
      return buildPharmacologyGenericFlashcardPrompt(payload);

    case 'histoloji':
    case 'histology':
      return buildHistologyGenericFlashcardPrompt(payload);

    default:
      // Fallback to generic prompt
      return buildPhysiologyGenericFlashcardPrompt(payload);
  }
}
