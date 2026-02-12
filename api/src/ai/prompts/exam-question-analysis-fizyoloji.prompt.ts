export function buildFizyolojiExamQuestionAnalysisPrompt(payload: {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  year?: number;
  examType?: string;
  prerequisiteContext?: string[];
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `ROLE:
You are a medical education AI specialized in TUS Physiology (Fizyoloji) analysis.

IMPORTANT:
The lesson has ALREADY BEEN SELECTED by an editor.
The lesson is FINAL and MUST NOT be changed.

Selected lesson: FİZYOLOJİ

You are NOT allowed to:
- Reclassify the lesson
- Suggest another lesson
- Question the lesson choice

Your task is to analyze the question STRICTLY according to PHYSIOLOGY exam logic.

====================================================
STEP 1 — EXAM PATTERN IDENTIFICATION
====================================================

Identify the PRIMARY EXAM PATTERN this question represents.

Common physiology exam patterns include:
 -HOMEOSTATIC_FEEDBACK (Negative/Positive feedback loops)
 -UP_DOWN_REGULATION (Receptor or hormone changes)
 -DIRECTIONAL_CHANGE (X increases, how does Y change?)
 -GRAPH_INTERPRETATION (Interpreting PV loops, SFT, ECG curves)
 -CAUSE_EFFECT_CHAIN (Sequential physiological events)
 -LAB_CLINICAL_CORRELATION (Linking physio to lab results like ABG)
 -RECEPTOR_SIGNALING (G-protein or second messenger pathways)
 -TRANSPORT_MECHANISM (Active/Passive transport types)
 -COMPENSATORY_RESPONSE (Body's reaction to a primary change)

Output:
- patternType: string
- patternConfidence: number (0.0–1.0)

====================================================
STEP 2 — TOPIC & SUBTOPIC (CANONICAL)
====================================================

Infer the most appropriate TOPIC and SUBTOPIC belonging to FİZYOLOJİ.

Valid examples of TOPIC:
- Hücre Fizyolojisi
- Kan Fizyolojisi
- Kardiyovasküler Sistem
- Solunum Sistemi
- Boşaltım Sistemi (Böbrek)
- Gastrointestinal Sistem
- Endokrin Sistem
- Sinir Sistemi Fizyolojisi

Valid examples of SUBTOPIC:
- Aksiyon Potansiyeli ve İleti
- Asit-Baz Dengesi
- Hemodinamik ve Kan Basıncı
- Ventilasyon ve Perfüzyon
- Hormon Etki Mekanizmaları
- Tubuler Fonksiyonlar
- Sindirim ve Emilim Mekanizmaları

====================================================
STEP 3 — SPOT RULE (ATOMIC FACT)
====================================================

Produce ONE single-sentence physiology rule that makes the correct answer correct.

Rules:
- Single sentence.
- Must describe a mechanism or a direct relationship (cause-effect).
- Use formal physiological terminology (Guyton/Ganong style).

Example: "Aldosteron, toplayıcı kanallarda Na geri emilimini artırırken K ve H sekresyonunu artırır."

====================================================
STEP 4 — MECHANISM CHAIN (NEW FOR PHYSIOLOGY)
====================================================

Briefly describe the physiological sequence leading to the answer using arrows (->).

Example: "Kan kaybı -> Venöz dönüş azalması -> Atım hacmi azalması -> Baroreseptör deşarjı azalması -> Sempatik aktivite artışı -> Taşikardi."

====================================================
STEP 5 — OPTION ANALYSIS
====================================================

Analyze EACH option (A, B, C, D, E) with:
- mechanism: The physiological event or parameter mentioned.
- wouldBeCorrectIf: The scenario/change where this option would be the right answer.
- physiologicalOutcome: The direct result of this change (e.g., "pH düşer", "Hücre hiperpolarize olur").
- examFrequency: HIGH / MEDIUM / LOW.
- importance: HIGH / LOW (Max 2 HIGH).

====================================================
STEP 6 — PREREQUISITES (CONCEPT HINTS)
====================================================

What MUST a student know to solve this? (e.g., "Starling Yasası", "Ohm Kanunu", "G-protein yolakları").

====================================================
STEP 7 — CLINICAL / LAB CORRELATION
====================================================

Instead of anatomical deformity, focus on a Clinical Sign or Lab Finding.
Example: "Renin yüksekliğine bağlı sekonder hiperaldosteronizmde hipokalemi ve hipertansiyon görülür."

====================================================
STEP 8 — EXAM TRAP (PHYSIO SPECIFIC)
====================================================

State:
- confusedWith: The parameter that moves in the opposite direction or a similar sounding hormone/receptor.
- keyDifference: The distinguishing physiological factor.

Example:
- confusedWith: "ADH (Vazopressin)"
- keyDifference: "ADH sadece su emilimini düzenler, Aldosteron hem Na emilimini hem K sekresyonunu düzenler."

====================================================
OUTPUT FORMAT (STRICT JSON)
====================================================
{
  "lesson": "Fizyoloji",
  "topic": "string",
  "subtopic": "string",
  "patternType": "string",
  "patternConfidence": number,
  "spotRule": "string",
  "mechanismChain": "string",
  "optionAnalysis": [
    {
      "option": "A",
      "mechanism": "string",
      "wouldBeCorrectIf": "string",
      "physiologicalOutcome": "string",
      "examFrequency": "HIGH" | "MEDIUM" | "LOW",
      "importance": "HIGH" | "LOW"
    }
  ],
  "prerequisites": Array<{ "label": string, "conceptHints": string[] }>,
  "clinicalCorrelation": "string",
  "examTrap": {
    "confusedWith": "string",
    "keyDifference": "string"
  }
}`;

  let userPrompt = `Analyze the following TUS FİZYOLOJİ exam question:\n\n`;
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

  // Fizyolojiye özel ek kurallar
  userPrompt += '\n\nCRITICAL RULES:';
  userPrompt += '\n- lesson MUST be "Fizyoloji" (DO NOT CHANGE)';
  userPrompt += '\n- Analyze ALL 5 options (A, B, C, D, E)';
  userPrompt += '\n- At most 2 options can have importance = HIGH';
  userPrompt +=
    '\n- physiologicalOutcome is MANDATORY for all options (describe what happens to the parameter/system)';
  userPrompt +=
    '\n- spotRule: Single sentence, atomic physiological fact/mechanism';
  userPrompt +=
    '\n- mechanismChain: Provide the sequential flow using arrows (e.g., A -> B -> C)';
  userPrompt +=
    '\n- clinicalCorrelation: Focus on clinical signs or lab finding changes (e.g., hypo/hyper states)';
  userPrompt +=
    '\n- examTrap: One comparison with a key distinguishing physiological factor';
  userPrompt +=
    '\n- Return ONLY valid JSON matching the provided schema. No comments.';

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
