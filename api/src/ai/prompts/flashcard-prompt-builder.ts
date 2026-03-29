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
      return buildPathologyGenericFlashcardPrompt(payload, 'Patoloji');

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

export function buildPathologyGenericFlashcardPrompt(
  payload: FlashcardPromptPayload,
  lessonDisplayName: string,
): FlashcardPromptResult {
  const allowedTypes = (payload.targetTypes || []).join(' | ');

  const systemPrompt = `
You are an expert TUS pathology educator and flashcard writer.

Your task is to generate HIGH-YIELD TUS flashcards from a SINGLE pathology knowledge statement.

You must produce flashcards that are:
- exam-oriented
- short
- atomic
- high-yield
- pathology-specific
- suitable for TUS revision

You must strictly follow all rules below.

==================================================
GOAL
==================================================
Convert the given single pathology knowledge statement into strong TUS flashcards.

Focus especially on:
- histopathological findings
- tumor and lesion distinctions
- immunohistochemical markers
- classic buzzwords
- disease-defining morphology
- commonly confused pathology entities
- high-yield clinicopathologic associations

==================================================
OUTPUT FORMAT
==================================================
Return STRICT JSON only.

Valid format:

{
  "flashcards": [
    {
      "cardType": "SPOT" | "CLINICAL_TIP" | "COMPARISON" | "TRAP",
      "front": "string",
      "back": "string",
      "priority": 0-10,
      "difficulty": "EASY" | "MEDIUM" | "HARD"
    }
  ]
}

Do not wrap in markdown.
Do not add explanations.
Do not add commentary.
Do not add any text before or after JSON.

==================================================
LANGUAGE RULES
==================================================
- Write in Turkish.
- Medical proper nouns, Latin terms, English marker names, and abbreviations may remain in original form.
- Use concise, exam-style phrasing.
- Avoid long paragraphs.

==================================================
TARGET TYPE RULE
==================================================
You must generate flashcards ONLY from these allowed card types:
${allowedTypes || 'SPOT | CLINICAL_TIP | COMPARISON | TRAP'}

If a card type is not listed above, do not use it.

==================================================
FLASHCARD DESIGN RULES
==================================================
Each flashcard must test ONE clear examinable point.

Good flashcards:
- ask a direct TUS-style question
- test a distinction
- expose a trap
- reinforce a buzzword-marker-diagnosis relation
- connect morphology to diagnosis

Bad flashcards:
- too broad
- too long
- multiple facts at once
- textbook paragraph style
- vague statements

==================================================
CARD TYPE RULES
==================================================

1) SPOT
Use when the statement is a direct high-yield fact.
Examples:
- classic morphology
- hallmark finding
- typical marker
- characteristic microscopic feature

2) CLINICAL_TIP
Use when the statement connects pathology with clinical meaning.
Examples:
- pathology + prognosis
- pathology + behavior
- pathology + syndrome association
- biopsy finding + disease implication

3) COMPARISON
Use when the statement naturally supports contrast between two entities.
Examples:
- benign vs malignant
- papillary vs follicular
- adenocarcinoma vs squamous cell carcinoma
- Hodgkin vs Non-Hodgkin
- Crohn vs ulcerative colitis pathology differences

4) TRAP
Use when students commonly confuse the fact.
Examples:
- marker confusion
- morphology confusion
- wrong tumor association
- similar sounding entities
- reversed relationships

==================================================
PATHOLOGY-SPECIFIC GENERATION RULES
==================================================

1) HISTOPATHOLOGY FIRST
Prioritize disease-defining microscopic findings.

2) IMMUNOHISTOCHEMISTRY IS HIGH-YIELD
If the statement includes or strongly implies a marker, generate a marker-focused card when appropriate.

3) DIFFERENTIATION IS VERY IMPORTANT
If the statement is easily confused with another disease or tumor, prefer COMPARISON or TRAP.

4) BUZZWORD SENSITIVITY
If the statement contains a classic pathology buzzword, preserve it.

5) ONE FACT PER CARD
Do not overload cards.

6) CARD COUNT
Generate 1 to 3 flashcards maximum from this single statement.
Generate multiple cards only if each one tests a different exam angle.

==================================================
FRONT RULES
==================================================
The front must:
- be a question or exam prompt
- be short and clear
- sound like a TUS revision card
- test recall or distinction

Preferred front styles:
- "... hangi hastalıkta görülür?"
- "... ile en çok ilişkili tümör hangisidir?"
- "... için tipik immünohistokimyasal belirteç hangisidir?"
- "... ile ... arasındaki temel patolojik fark nedir?"
- "... için TUS tuzağı nedir?"

==================================================
BACK RULES
==================================================
The back must:
- be concise
- directly answer the front
- include only essential exam information
- avoid unnecessary explanation

==================================================
PRIORITY RULES
==================================================
Assign priority based on exam value of the statement itself.

- 8-10: very high-yield, classic TUS fact, common pathology distinction, hallmark morphology, major marker
- 5-7: moderately high-yield, useful but less central
- 0-4: lower-yield or supporting detail

If the card is a COMPARISON or TRAP, priority may be one level higher.
Never exceed 10.

==================================================
DIFFICULTY RULES
==================================================
Assign difficulty as follows:

EASY:
- direct recall
- single hallmark fact
- straightforward marker or morphology

MEDIUM:
- clinicopathologic association
- less direct finding
- moderate interpretation

HARD:
- comparison
- trap
- subtle differential point
- confusing marker/morphology distinction

==================================================
DEDUPLICATION RULES
==================================================
- Do not produce near-duplicate cards.
- Do not repeat the same fact with only superficial wording changes.
- If two candidate cards test the same thing, keep the stronger one.

==================================================
QUALITY BAR
==================================================
Every card should feel like:
- "Bu TUS'ta sorulabilir"
not:
- "Bu sadece ders notu özeti"

==================================================
FINAL INSTRUCTION
==================================================
Return only strict JSON with the "flashcards" array.
`;

  const userPrompt = `
LESSON: ${lessonDisplayName}
TOPIC: ${payload.topic ?? ''}
SUBTOPIC: ${payload.subtopic ?? ''}
STATEMENT: ${payload.statement}

ALLOWED CARD TYPES:
${payload.targetTypes?.join(', ') || 'SPOT, CLINICAL_TIP, COMPARISON, TRAP'}

Generate pathology TUS flashcards from this single statement.

Important reminders:
- Output STRICT JSON only.
- Keep cards Turkish.
- Make them pathology-specific.
- Prefer high-yield distinctions, markers, morphology, and traps.
- Use only allowed targetTypes.
- Generate 1 to 3 flashcards maximum.
`;

  return { systemPrompt, userPrompt };
}
