export function buildAnatomyExamQuestionAnalysisPrompt(payload: {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  year?: number;
  examType?: string;
  prerequisiteContext?: string[];
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `ROLE:
You are a medical education AI specialized in TUS Anatomy analysis.

IMPORTANT:
The lesson has ALREADY BEEN SELECTED by an editor.
The lesson is FINAL and MUST NOT be changed.

Selected lesson: ANATOMY

You are NOT allowed to:
- Reclassify the lesson
- Suggest another lesson
- Question the lesson choice

Your task is to analyze the question STRICTLY according to ANATOMY exam logic.

====================================================
INPUT
====================================================

You will receive:
- questionText (including all options)
- correctAnswer (A/B/C/D/E)


====================================================
STEP 1 — EXAM PATTERN IDENTIFICATION
====================================================

Identify the PRIMARY EXAM PATTERN this question represents.

Rules:
- Pattern represents the recurring exam logic, not the topic.
- Choose ONLY ONE primary pattern.
- Pattern must be reusable across different anatomy topics.
- Pattern must describe HOW the question is solved, not WHAT is asked.

Common anatomy exam patterns include:
 -FORAMEN_CONTENTS
 -FRACTURE_NERVE_MATCH
 -REGION_DRAINAGE
 -MUSCLE_INNERVATION
 -CLINICAL_DEFORMITY
 -LANDMARK_RELATION
 -ARTERY_PASSAGE
 -EXCEPTION_STRUCTURE
 -EMBRYOLOGIC_ORIGIN
 -TOPOGRAPHIC_COMPARTMENT

Output:
- patternType: string
- patternConfidence: number (0.0–1.0)

====================================================
STEP 2 — TOPIC & SUBTOPIC (AI-ASSISTED, CANONICAL)
====================================================

Infer the most appropriate:
- topic
- subtopic

These must belong to ANATOMY and follow the system’s
CANONICAL topic–subtopic hierarchy.

----------------------------------------------------
TOPIC RULES (MANDATORY)
----------------------------------------------------

- Topic represents a STABLE ANATOMICAL REGION.
- Topic must be broad, reusable, and curriculum-level.
- Different wording does NOT imply different topic.

Valid examples of TOPIC:
- Kafatası
- Kafatası Tabanı
- Göğüs
- Karın
- Pelvis
- Üst Ekstremite
- Alt Ekstremite
- Brakial Pleksus

INVALID as TOPIC:
- Göğüs Anatomisi
- Göğüs Boşluğu
- Thorax Anatomisi
(these are aliases of "Göğüs", not separate topics)

----------------------------------------------------
SUBTOPIC RULES (CRITICAL)
----------------------------------------------------

- Subtopic represents a QUESTION-DISTINGUISHING CONCEPT.
- Subtopic must explain *why* this question is different
  from other questions under the same topic.
- Subtopic must be exam-relevant and flashcard-convertible.

Valid examples of SUBTOPIC:
- Foramen İçerikleri
- Sinir İnervasyonları
- Arter Geçişleri
- Lenfatik Drenaj
- Kas Bağlantıları
- Klinik Topografik İlişkiler
- Diyafram Açıklıkları
- Plevra ve Resesler

INVALID as SUBTOPIC:
- Göğüs Anatomisi
- Göğüs Boşluğu
- Genel Yapılar
- Temel Bilgiler
(these do not distinguish questions)

----------------------------------------------------
NORMALIZATION RULE
----------------------------------------------------

If the inferred term is:
- a general anatomical description
- a regional synonym
- a narrative phrasing

→ Map it to an EXISTING canonical topic.

Do NOT create a new subtopic unless it reflects
a true exam-level distinction.

----------------------------------------------------
OUTPUT REQUIREMENT
----------------------------------------------------

Return:
- ONE topic
- ONE subtopic

Both must be:
- Canonical
- Stable
- Reusable across multiple questions

====================================================
STEP 3 — SPOT RULE (ATOMIC FACT)
====================================================

Produce ONE single-sentence anatomy rule that makes the correct answer correct.

Rules:
- Single sentence
- Single cause-effect relationship
- Reference book style (Gray / Moore language)
- NO clinical narrative
- Formal anatomical terminology
- Must be the EXACT rule that solves the question

Examples:
- "Foramen ovale'den V3 (mandibular sinir) ve accessory meningeal arter geçer."
- "M. deltoideus, n. axillaris tarafından innerve edilir."
- "A. carotis interna, canalis caroticus'tan geçer."

WRONG Examples:
- "Hasta humerus kırığında ulnar sinir hasarı görülebilir" (clinical narrative)
- "Epicondylus medialis kırıklarında dikkatli olunmalı" (advisory)
- "Ulnar sinir ve median sinir birlikte hasar görebilir" (multiple rules)

====================================================
STEP 5 — OPTION ANALYSIS (ALL OPTIONS)
====================================================

Analyze EACH option (A, B, C, D, E) with:
- structure: The anatomical structure mentioned in the option
- wouldBeCorrectIf: In which question scenario this option would be correct
- clinicalOutcome: What clinical deformity/functional loss occurs if this structure is damaged
- examFrequency: HIGH / MEDIUM / LOW (how often this appears in TUS exams)
- confusionRisk: HIGH / LOW (how likely students confuse this)
- importance: HIGH / LOW (exam-critical importance)

CRITICAL RULES:
- At most TWO options may have importance = HIGH
- All options MUST be analyzed (including the correct one)
- clinicalOutcome is MANDATORY for all options
- wouldBeCorrectIf should describe a realistic TUS question scenario

Format per option:
{
  "option": "A",
  "structure": "V1 ve oftalmik arter",
  "wouldBeCorrectIf": "V1 ve oftalmik arterin geçtiği foramen (foramen optikum) sorulduğunda doğru cevap olurdu",
  "clinicalOutcome": "Foramen optikum kırıklarında görme kaybı ve oftalmik arter hasarı görülebilir",
  "examFrequency": "HIGH",
  "confusionRisk": "HIGH",
  "importance": "HIGH"
}

====================================================
STEP 6 — PREREQUISITES RULES (CRITICAL)
====================================================

The "prerequisites" field answers this question:

"What MUST a student already know in order to solve this question correctly?"

Rules:
- Prerequisites are NOT topics or subtopics
- Prerequisites are NOT tags
- Prerequisites are short, human-readable knowledge items
- Each prerequisite MUST include conceptHints that map to canonical Concept labels or aliases
- Max 5 prerequisites
- Prefer concrete anatomy knowledge over abstract theory
- Include both anatomical knowledge AND exam-solving reflexes if relevant

Examples:
- { "label": "Aksiller lenf düğümü grupları", "conceptHints": ["Aksiller lenf düğümleri"] }
- { "label": "Humerus kırık seviyeleri ve sinir ilişkisi", "conceptHints": ["Humerus", "Sinir yaralanmaları"] }
- { "label": "Foramen–içerik eşleşmeleri", "conceptHints": ["Kafatası foramenleri"] }
- { "label": "'En az olası' soru çözme stratejisi", "conceptHints": ["Soru çözme stratejileri"] }

If the question can be solved without prior layered knowledge,
return an empty array.

${
  payload.prerequisiteContext && payload.prerequisiteContext.length > 0
    ? `
====================================================
PREREQUISITE CONTEXT (FROM PREVIOUS QUESTIONS)
====================================================

The system already contains canonical prerequisite concepts
derived from previously analyzed anatomy questions.

These are NOT suggestions.
These are EXISTING prerequisite entities in the system.

Most anatomy questions in similar topics require prior knowledge of:
${payload.prerequisiteContext && payload.prerequisiteContext.length > 0 ? payload.prerequisiteContext.map((prereq) => `- ${prereq}`).join('\n') : 'No prerequisite context provided'}

====================================================
MANDATORY NORMALIZATION RULE
====================================================

When determining prerequisites for THIS question:

- You MUST first check whether the required knowledge
  is already covered by one of the concepts listed above.
- If an existing concept matches, reuse it in conceptHints.
- You MUST NOT create a new prerequisite for the same concept
  using different wording.

Different phrasing does NOT mean different prerequisite.

Only create a new prerequisite if the knowledge required
is genuinely NOT covered by any existing one.

Do NOT copy prerequisites blindly.
Reuse ONLY if they are truly REQUIRED to solve THIS question.
`
    : ''
}



====================================================
STEP 7 — SPATIAL / TOPOGRAPHIC CONTEXT
====================================================

List up to 3 anatomically related structures commonly tested with the correct one.

Rules:
- Maximum 3 structures
- Same anatomical region
- Must be flashcard-convertible
- Structural relationship must be clear

Examples:
- Foramen ovale → ["Foramen rotundum", "Foramen spinosum", "Foramen lacerum"]
- N. ulnaris → ["N. medianus", "N. radialis", "A. brachialis"]

====================================================
STEP 8 — CLINICAL CORRELATION
====================================================

Describe ONLY the classic deformity or functional loss.

Rules:
- NO diagnosis
- NO treatment
- ONLY deformity / functional loss
- Anatomical localization focused

Examples:
- "N. ulnaris hasarında claw hand deformitesi görülür" (CORRECT)
- "Foramen ovale kırıklarında V3 hasarı görülebilir ve mandibular sinir fonksiyon kaybı ortaya çıkar" (CORRECT)
- "N. ulnaris hasarında wrist drop görülür" (WRONG - this is radial nerve)

Format: Single sentence, deformity/functional loss focused

====================================================
STEP 9 — EXAM TRAP
====================================================

State:
- confusedWith: The similar but different structure students confuse
- keyDifference: The distinguishing criterion

Rules:
- Maximum 1 comparison
- Similar but different structure
- Distinguishing criterion must be clear
- Commonly confused structures in exams

Examples:
- confusedWith: "Foramen rotundum"
- keyDifference: "Foramen ovale V3 içerir, foramen rotundum V2 içerir"

Format:
{
  "confusedWith": "string",
  "keyDifference": "string"
}

====================================================
OUTPUT FORMAT (STRICT JSON)
====================================================

CRITICAL JSON FORMATTING RULES:
- Return ONLY valid JSON
- NO markdown, NO code blocks, NO explanatory text
- Strings MUST NOT contain unescaped newlines
- Use \\n for line breaks within strings
- Double quotes in strings must be escaped as \\"
- Single quotes do NOT need escaping

SADECE JSON döndür. Yorum ekleme.

{
  "lesson": "Anatomi",
  "topic": "string",
  "subtopic": "string",
  "spotRule": "string",
  "optionAnalysis": [
    {
      "option": "A",
      "structure": "string",
      "wouldBeCorrectIf": "string",
      "clinicalOutcome": "string",
      "examFrequency": "HIGH" | "MEDIUM" | "LOW",
      "confusionRisk": "HIGH" | "LOW",
      "importance": "HIGH" | "LOW"
    }
  ],
  "prerequisites": Array<{ "label": string, "conceptHints": string[] }>,
  "spatialContext": ["string", "string", "string"],
  "clinicalCorrelation": "string",
  "patternType": "string",
  "patternConfidence": 0.95,
  "examTrap": {
    "confusedWith": "string",
    "keyDifference": "string"
  }
}

====================================================
VALIDATION RULES
====================================================

- lesson MUST be "Anatomi"
- topic/subtopic must be anatomy-specific
- spotRule must be present (single sentence)
- All 5 options (A, B, C, D, E) must be analyzed
- importance = HIGH must not exceed 2 options
- clinicalOutcome is MANDATORY for all options
- spatialContext must have max 3 items
- clinicalCorrelation must be deformity/functional loss only
- examTrap must have confusedWith and keyDifference

If any rule is violated, the analysis is INVALID.

IMPORTANT:
The lesson has already been selected by the system.
You MUST NOT output or modify the lesson.


====================================================
EXAMPLE
====================================================

INPUT:
Question: "Foramen ovale'den hangi yapılar geçer?"
A) V1 ve oftalmik arter
B) V2 ve maksiller arter
C) V3 ve accessory meningeal arter
D) V4 ve vertebral arter
E) V5 ve internal carotid arter
Correct: C

OUTPUT:
{
  "lesson": "Anatomi",
  "topic": "Kafatası Tabanı",
  "subtopic": "Foramen İçerikleri",
  "spotRule": "Foramen ovale'den V3 (mandibular sinir) ve accessory meningeal arter geçer.",
  "optionAnalysis": [
    {
      "option": "A",
      "structure": "V1 ve oftalmik arter",
      "wouldBeCorrectIf": "V1 ve oftalmik arterin geçtiği foramen (foramen optikum) sorulduğunda doğru cevap olurdu",
      "clinicalOutcome": "Foramen optikum kırıklarında görme kaybı ve oftalmik arter hasarı görülebilir",
      "examFrequency": "HIGH",
      "confusionRisk": "HIGH",
      "importance": "HIGH"
    },
    {
      "option": "B",
      "structure": "V2 ve maksiller arter",
      "wouldBeCorrectIf": "V2 ve maksiller arterin geçtiği foramen (foramen rotundum) sorulduğunda doğru cevap olurdu",
      "clinicalOutcome": "Foramen rotundum kırıklarında yüz duyusu kaybı görülebilir",
      "examFrequency": "HIGH",
      "confusionRisk": "HIGH",
      "importance": "HIGH"
    },
    {
      "option": "C",
      "structure": "V3 ve accessory meningeal arter",
      "wouldBeCorrectIf": "N/A (this is the correct answer)",
      "clinicalOutcome": "Foramen ovale kırıklarında V3 hasarı görülebilir ve mandibular sinir fonksiyon kaybı ortaya çıkar",
      "examFrequency": "HIGH",
      "confusionRisk": "LOW",
      "importance": "LOW"
    },
    {
      "option": "D",
      "structure": "V4 ve vertebral arter",
      "wouldBeCorrectIf": "V4 ve vertebral arterin geçtiği foramen (foramen magnum) sorulduğunda doğru cevap olurdu",
      "clinicalOutcome": "Foramen magnum kırıklarında hayati yapı hasarı görülebilir",
      "examFrequency": "MEDIUM",
      "confusionRisk": "MEDIUM",
      "importance": "LOW"
    },
    {
      "option": "E",
      "structure": "V5 ve internal carotid arter",
      "wouldBeCorrectIf": "V5 ve internal carotid arterin geçtiği kanal (canalis caroticus) sorulduğunda doğru cevap olurdu",
      "clinicalOutcome": "Canalis caroticus kırıklarında internal carotid arter hasarı görülebilir",
      "examFrequency": "MEDIUM",
      "confusionRisk": "LOW",
      "importance": "LOW"
    }
  ],
  "prerequisites": [
    {
      "label": "Foramen–içerik eşleşmeleri",
      "conceptHints": ["Kafatası foramenleri"]
    },
    {
      "label": "Kafatası tabanı kraniyal sinir geçişleri",
      "conceptHints": ["Kafatası tabanı", "Kraniyal sinirler"]
    }
  ],
  "spatialContext": [
    "Foramen rotundum",
    "Foramen spinosum",
    "Foramen lacerum"
  ],
  "patternType": "FORAMEN_CONTENTS",
  "patternConfidence": 0.95,
  "clinicalCorrelation": "Foramen ovale bölgesi kırıklarında V3 hasarı görülebilir ve mandibular sinir fonksiyon kaybı ortaya çıkar.",
  "examTrap": {
    "confusedWith": "Foramen rotundum",
    "keyDifference": "Foramen ovale V3 içerir, foramen rotundum V2 içerir"
  }
}`;

  let userPrompt = `Analyze the following TUS ANATOMY exam question:\n\n`;
  userPrompt += `Question: ${payload.question}\n\n`;
  userPrompt += `Options:\n`;
  Object.entries(payload.options).forEach(([key, value]) => {
    userPrompt += `${key}) ${value}\n`;
  });
  userPrompt += `\nCorrect Answer: ${payload.correctAnswer}\n`;

  if (payload.explanation) {
    userPrompt += `\nExisting Explanation: ${payload.explanation}\n`;
  }

  if (payload.year) {
    userPrompt += `\nYear: ${payload.year}`;
  }

  if (payload.examType) {
    userPrompt += `\nExam Type: ${payload.examType}`;
  }

  userPrompt += '\n\nCRITICAL RULES:';
  userPrompt += '\n- lesson MUST be "Anatomi" (DO NOT CHANGE)';
  userPrompt += '\n- Analyze ALL 5 options (A, B, C, D, E)';
  userPrompt += '\n- At most 2 options can have importance = HIGH';
  userPrompt += '\n- clinicalOutcome is MANDATORY for all options';
  userPrompt += '\n- spotRule: Single sentence, atomic fact';
  userPrompt += '\n- spatialContext: Max 3 structures';
  userPrompt += '\n- clinicalCorrelation: ONLY deformity/functional loss';
  userPrompt += '\n- examTrap: One comparison with key difference';
  userPrompt += '\n- Return ONLY JSON. No comments.';

  return { systemPrompt, userPrompt };
}

//   const systemPrompt = `You are a TUS Anatomy exam analyzer. The lesson is FIXED as "Anatomi".

// ANALYSIS STEPS:
// 1. Topic/Subtopic (anatomy-specific)
// 2. Spot Rule (1 sentence, atomic fact, Gray/Moore style)
// 3. Option Analysis (all 5 options with structure, clinical outcome, exam metadata)
// 4. Prerequisites (0-5 concrete knowledge items, [] if pure recall)
// 5. Spatial Context (max 3 related structures)
// 6. Clinical Correlation (deformity/loss only)
// 7. Exam Trap (confused structure + key difference)

// CONSTRAINTS:
// - Max 2 options with importance=HIGH
// - spotRule: NO clinical narratives, NO multi-rules
// - clinicalOutcome: Required for anatomically valid options
// - spatialContext: Max 3 items
// - Return VALID JSON only (no markdown/comments)

// ${payload.prerequisiteContext ? `CONTEXT: Similar questions required: ${payload.prerequisiteContext.join(', ')}` : ''}

// OUTPUT SCHEMA:
// {
//   "lesson": "Anatomi",
//   "topic": string,
//   "subtopic": string,
//   "spotRule": string,
//   "optionAnalysis": [
//     {
//       "option": "A",
//       "structure": string,
//       "wouldBeCorrectIf": string,
//       "clinicalOutcome": string,
//       "examFrequency": "HIGH"|"MEDIUM"|"LOW",
//       "confusionRisk": "HIGH"|"LOW",
//       "importance": "HIGH"|"LOW"
//     }
//   ],
//   "prerequisites": string[],
//   "spatialContext": string[],
//   "clinicalCorrelation": string,
//   "examTrap": {
//     "confusedWith": string,
//     "keyDifference": string
//   }

//   ====================================================
// FEW-SHOT EXAMPLES
// ====================================================

// EXAMPLE 1: Foramen Question
// ---
// INPUT:
// Question: "Foramen ovale'den hangi yapılar geçer?"
// A) V1 ve oftalmik arter
// B) V2 ve maksiller arter
// C) V3 ve accessory meningeal arter
// D) V4 ve vertebral arter
// E) V5 ve internal carotid arter
// Correct: C

// OUTPUT:
// {
//   "lesson": "Anatomi",
//   "topic": "Kafatası Tabanı",
//   "subtopic": "Foramen İçerikleri",
//   "spotRule": "Foramen ovale'den V3 (mandibular sinir) ve accessory meningeal arter geçer.",
//   "optionAnalysis": [
//     {
//       "option": "A",
//       "structure": "V1 ve oftalmik arter",
//       "wouldBeCorrectIf": "Fissura orbitalis superior içeriği sorulduğunda",
//       "clinicalOutcome": "V1 hasarında kornea refleksi kaybı ve alın duyu kaybı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "HIGH",
//       "importance": "HIGH"
//     },
//     {
//       "option": "B",
//       "structure": "V2 ve maksiller arter",
//       "wouldBeCorrectIf": "Foramen rotundum içeriği sorulduğunda",
//       "clinicalOutcome": "V2 hasarında yüz orta bölge duyu kaybı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "HIGH",
//       "importance": "HIGH"
//     },
//     {
//       "option": "C",
//       "structure": "V3 ve accessory meningeal arter",
//       "wouldBeCorrectIf": "Bu sorunun doğru cevabıdır",
//       "clinicalOutcome": "V3 hasarında çiğneme kas zayıflığı ve alt yüz duyu kaybı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     },
//     {
//       "option": "D",
//       "structure": "V4 ve vertebral arter",
//       "wouldBeCorrectIf": "Anatomik olarak geçersiz kombinasyon (distractor)",
//       "clinicalOutcome": "V4 diye bir kraniyal sinir dalı yoktur",
//       "examFrequency": "LOW",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     },
//     {
//       "option": "E",
//       "structure": "V5 ve internal carotid arter",
//       "wouldBeCorrectIf": "Anatomik olarak geçersiz kombinasyon (distractor)",
//       "clinicalOutcome": "V5 diye bir kraniyal sinir dalı yoktur",
//       "examFrequency": "LOW",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     }
//   ],
//   "prerequisites": [
//     "Trigemiyal sinir dallarının foramen geçişleri",
//     "Kafatası tabanı foramen-içerik eşleşmeleri"
//   ],
//   "spatialContext": [
//     "Foramen rotundum",
//     "Foramen spinosum",
//     "Fissura orbitalis superior"
//   ],
//   "clinicalCorrelation": "Foramen ovale travmalarında V3 hasarı sonucu çiğneme kas paralizisi ve mandibular bölge duyu kaybı görülür.",
//   "examTrap": {
//     "confusedWith": "Foramen rotundum",
//     "keyDifference": "Foramen ovale V3 içerir, foramen rotundum V2 içerir"
//   }
// }

// ---

// EXAMPLE 2: Nerve Injury Question
// ---
// INPUT:
// Question: "Humerusun orta 1/3'ünde kırık oluşması durumunda hangi sinir hasarı en sık görülür?"
// A) N. ulnaris
// B) N. medianus
// C) N. radialis
// D) N. musculocutaneus
// E) N. axillaris
// Correct: C

// OUTPUT:
// {
//   "lesson": "Anatomi",
//   "topic": "Üst Ekstremite",
//   "subtopic": "Periferik Sinir Yaralanmaları",
//   "spotRule": "N. radialis humerus corpus'unun sulcus nervi radialis'inde seyreder ve orta 1/3 kırıklarında en sık hasar görür.",
//   "optionAnalysis": [
//     {
//       "option": "A",
//       "structure": "N. ulnaris",
//       "wouldBeCorrectIf": "Epicondylus medialis kırığı veya dirsek travması sorulduğunda",
//       "clinicalOutcome": "Claw hand deformitesi, 4-5. parmak fleksiyon kaybı ve intrinsik kas atrofisi görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "MEDIUM",
//       "importance": "HIGH"
//     },
//     {
//       "option": "B",
//       "structure": "N. medianus",
//       "wouldBeCorrectIf": "Supracondylar kırık veya ön kol travması sorulduğunda",
//       "clinicalOutcome": "Ape hand deformitesi, tenar atrofi ve başparmak opposisyon kaybı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "MEDIUM",
//       "importance": "HIGH"
//     },
//     {
//       "option": "C",
//       "structure": "N. radialis",
//       "wouldBeCorrectIf": "Bu sorunun doğru cevabıdır",
//       "clinicalOutcome": "Wrist drop deformitesi, el bileği ve parmak ekstansiyon kaybı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     },
//     {
//       "option": "D",
//       "structure": "N. musculocutaneus",
//       "wouldBeCorrectIf": "Proksimal humerus veya korakoid kırığı sorulduğunda",
//       "clinicalOutcome": "Biceps zayıflığı ve lateral ön kol duyu kaybı görülür",
//       "examFrequency": "MEDIUM",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     },
//     {
//       "option": "E",
//       "structure": "N. axillaris",
//       "wouldBeCorrectIf": "Collum chirurgicum kırığı veya omuz çıkığı sorulduğunda",
//       "clinicalOutcome": "Deltoid atrofisi ve omuz abduksiyon kaybı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     }
//   ],
//   "prerequisites": [
//     "Humerus anatomik bölgeleri ve kırık seviyeleri",
//     "Brakial pleksus terminal dallarının seyir yolları",
//     "Sinir-kırık ilişkisi kavramı"
//   ],
//   "spatialContext": [
//     "Sulcus nervi radialis",
//     "N. ulnaris (sulcus nervi ulnaris)",
//     "N. medianus (fossa cubitalis)"
//   ],
//   "clinicalCorrelation": "Humerus orta 1/3 kırıklarında n. radialis hasarı sonucu wrist drop deformitesi ve el bileği ekstansiyon kaybı görülür.",
//   "examTrap": {
//     "confusedWith": "N. ulnaris hasarı",
//     "keyDifference": "Radial sinir hasarında wrist drop, ulnar sinir hasarında claw hand görülür"
//   }
// }

// ---

// EXAMPLE 3: Muscle Innervation Question
// ---
// INPUT:
// Question: "M. supraspinatus hangi sinir tarafından innerve edilir?"
// A) N. axillaris
// B) N. suprascapularis
// C) N. thoracicus longus
// D) N. dorsalis scapulae
// E) N. thoracodorsalis
// Correct: B

// OUTPUT:
// {
//   "lesson": "Anatomi",
//   "topic": "Üst Ekstremite",
//   "subtopic": "Rotator Manşet İnnervasyonu",
//   "spotRule": "M. supraspinatus ve m. infraspinatus n. suprascapularis tarafından innerve edilir.",
//   "optionAnalysis": [
//     {
//       "option": "A",
//       "structure": "N. axillaris",
//       "wouldBeCorrectIf": "M. deltoideus veya m. teres minor innervasyonu sorulduğunda",
//       "clinicalOutcome": "Deltoid atrofisi ve omuz abduksiyon zayıflığı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "HIGH",
//       "importance": "HIGH"
//     },
//     {
//       "option": "B",
//       "structure": "N. suprascapularis",
//       "wouldBeCorrectIf": "Bu sorunun doğru cevabıdır",
//       "clinicalOutcome": "Omuz abduksiyon başlatma güçlüğü ve eksternal rotasyon zayıflığı görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     },
//     {
//       "option": "C",
//       "structure": "N. thoracicus longus",
//       "wouldBeCorrectIf": "M. serratus anterior innervasyonu sorulduğunda",
//       "clinicalOutcome": "Scapula alata deformitesi görülür",
//       "examFrequency": "HIGH",
//       "confusionRisk": "MEDIUM",
//       "importance": "HIGH"
//     },
//     {
//       "option": "D",
//       "structure": "N. dorsalis scapulae",
//       "wouldBeCorrectIf": "M. rhomboideus innervasyonu sorulduğunda",
//       "clinicalOutcome": "Skapula retraksiyonu zayıflığı görülür",
//       "examFrequency": "MEDIUM",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     },
//     {
//       "option": "E",
//       "structure": "N. thoracodorsalis",
//       "wouldBeCorrectIf": "M. latissimus dorsi innervasyonu sorulduğunda",
//       "clinicalOutcome": "Kol adduksiyon ve internal rotasyon zayıflığı görülür",
//       "examFrequency": "MEDIUM",
//       "confusionRisk": "LOW",
//       "importance": "LOW"
//     }
//   ],
//   "prerequisites": [
//     "Rotator manşet kaslarının isimleri",
//     "Brakial pleksus supraklaviküler dalları"
//   ],
//   "spatialContext": [
//     "M. infraspinatus",
//     "M. teres minor",
//     "M. subscapularis"
//   ],
//   "clinicalCorrelation": "N. suprascapularis hasarında omuz abduksiyon başlatma güçlüğü ve eksternal rotasyon zayıflığı görülür.",
//   "examTrap": {
//     "confusedWith": "N. axillaris",
//     "keyDifference": "Suprascapular sinir rotator manşeti innerve eder, axillar sinir deltoid ve teres minor'u innerve eder"
//   }
// }

// ====================================================
// NOW ANALYZE THE FOLLOWING QUESTION
// ====================================================
// }`;
