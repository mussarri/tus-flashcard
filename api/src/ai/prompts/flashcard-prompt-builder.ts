import { buildAnatomyFlashcardPrompt } from './anatomy-flashcard.prompt';
import { buildFizyolojiFlashcardPrompt } from './fizyoloji-flashcard.prompt';

export interface FlashcardPromptPayload {
  statement: string;
  targetTypes: string[];
  lesson?: string;
  topic?: string;
  subtopic?: string;
}

export interface FlashcardPromptResult {
  systemPrompt: string;
  userPrompt: string;
}

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
      return buildFizyolojiFlashcardPrompt(payload);

    case 'biyokimya':
    case 'biochemistry':
      // TODO: Create buildBiyokimyaFlashcardPrompt
      return buildGenericFlashcardPrompt(payload, 'Biyokimya');

    case 'mikrobiyoloji':
    case 'microbiology':
      // TODO: Create buildMikrobiyolojiFlashcardPrompt
      return buildGenericFlashcardPrompt(payload, 'Mikrobiyoloji');

    case 'patoloji':
    case 'pathology':
      // TODO: Create buildPatolojiFlashcardPrompt
      return buildGenericFlashcardPrompt(payload, 'Patoloji');

    case 'farmakoloji':
    case 'pharmacology':
      // TODO: Create buildFarmakolojiFlashcardPrompt
      return buildGenericFlashcardPrompt(payload, 'Farmakoloji');

    default:
      // Fallback to generic prompt
      return buildGenericFlashcardPrompt(payload, payload.lesson || 'Genel');
  }
}

/**
 * Generic flashcard prompt for lessons without specific templates
 * Can be used as fallback or for non-basic science lessons
 */
function buildGenericFlashcardPrompt(
  payload: FlashcardPromptPayload,
  lessonDisplayName: string,
): FlashcardPromptResult {
  const targetTypesString = payload.targetTypes.join(', ');

  const systemPrompt = `# ROLE
Sen bir TUS ${lessonDisplayName} İçerik Mühendisisin. Görevin, sana verilen atomik bilgiyi (KnowledgePoint), belirtilen hedef kart tiplerine (targetTypes) dönüştürmektir.

# INPUT DATA
- Fact: "${payload.statement}"
- Target_Types: [${targetTypesString}]
- Lesson: ${lessonDisplayName}

# CARD_TYPES
1. **FUNCTIONAL_ANATOMY**: Temel mekanizma/fonksiyon açıklaması
2. **CLINICAL_CORRELATION**: Klinik vaka/patofizyoloji
3. **HIGH_YIELD_DISTINCTION**: İki kavram/yapı karşılaştırması
4. **EXCEPT_TRAP**: Sınav tuzağı/istisnai durum
5. **STRUCTURE_ID**: Yapı/kavram tanımlama (görsel gerektirebilir)
6. **CONTENTS_OF_SPACE**: Kompozisyon/içerik listeleme
7. **TOPOGRAPHIC_MAP**: Sıralama/sınıflandırma

# RULES
- TUS terminolojisi kullan
- Cevapları kısa ve net tut (max 20 kelime, gerekirse biraz uzun olabilir)
- Soru-cevap formatında düşün: öğrenci sınavda ne soruluyor?
- Sadece [${targetTypesString}] için kart üret
- Her target type için mutlaka bir kart üret

# OUTPUT FORMAT (Strict JSON)
{
  "CARD_TYPE_NAME": { "q": "Soru metni", "a": "Cevap metni" }
}

Örnek:
{
  "FUNCTIONAL_ANATOMY": { "q": "X'in görevi nedir?", "a": "Y sürecini gerçekleştirir" },
  "CLINICAL_CORRELATION": { "q": "X eksikliğinde ne olur?", "a": "Z sendromu gelişir" }
}
`;

  const userPrompt = `Aşağıdaki ${lessonDisplayName} bilgi noktasından [${targetTypesString}] tiplerinde flashcard üret:\n\n"${payload.statement}"`;

  return { systemPrompt, userPrompt };
}
