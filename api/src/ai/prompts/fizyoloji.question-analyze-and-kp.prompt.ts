export interface FizyolojiSingleCallPayload {
  question: string;
  options: Record<string, string>; // { A: "...", B: "...", ... }
  correctAnswer: string;
  explanation?: string;
  year?: number;
  lesson: string;
  topic?: string;
  subtopic?: string;
  repairRawOutput?: string;
}

export function buildFizyolojiSingleCallPrompt(
  payload: FizyolojiSingleCallPayload,
) {
  if (payload.repairRawOutput) {
    return {
      systemPrompt: `ROLE:
You are a strict JSON repair engine for TUS Fizyoloji single-call analysis outputs.

RULES:
- Return ONLY valid JSON.
- Do NOT add markdown, comments, or explanations.
- Do NOT invent new medical facts.
- Keep existing meaning; only fix structure/types to match schema.
- knowledgePoints must be an array.

OUTPUT SCHEMA:
{
  "lesson": "Fizyoloji",
  "topic": "string",
  "subtopic": "string",
  "patternType": "string",
  "patternConfidence": 0,
  "spotRule": "string",
  "mechanismChain": "string",
  "optionAnalysis": [
    {
      "option": "A",
      "mechanism": "string",
      "physiologicalOutcome": "string",
      "whyWrong": "string",
      "examFrequency": "HIGH|MEDIUM|LOW",
      "importance": "HIGH|LOW"
    }
  ],
  "prerequisites": [
    {
      "label": "string",
      "conceptHints": ["string"]
    }
  ],
  "clinicalCorrelation": "string",
  "examTrap": {
    "confusedWith": "string",
    "keyDifference": "string"
  },
  "knowledgePoints": [
    {
      "fact": "string",
      "normalizedKeyCandidate": "string",
      "priority": 0,
      "examRelevance": 0.0,
      "relationshipType": "MEASURED|TRAP|CLINICAL_OUTCOME",
      "derivedFrom": {
        "field": "spotRule|mechanismChain|examTrap|clinicalCorrelation|optionAnalysis",
        "note": "string"
      }
    }
  ],
  "meta": {
    "promptVersion": "fizyoloji-v1"
  }
}`,
      userPrompt: `Fix the following raw model output into strict valid JSON matching the schema.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  const systemPrompt = `
ROLE:
You are a medical education AI specialized in TUS Physiology (Fizyoloji).

IMPORTANT:
The lesson has ALREADY BEEN SELECTED by an editor.
The lesson is FINAL and MUST NOT be changed.

Selected lesson: FİZYOLOJİ

You are NOT allowed to:
- Change lesson
- Reclassify to another lesson
- Invent new physiological facts not inferable from the question
- Add mechanisms beyond question scope

LANGUAGE RULE:
- ALL output MUST be in TURKISH.
- Latin physiological terminology is allowed.

GOAL (SINGLE CALL):
1) Perform full TUS-style physiology analysis.
2) Generate atomic KnowledgePoint candidates derived from this question.

CRITICAL RULES:
- Analyze ALL 5 options (A–E).
- At most 2 options may have importance = HIGH.
- physiologicalOutcome is mandatory for every option.
- spotRule must directly explain why the correct answer is correct.
- mechanismChain must use arrows (->) and max 6 steps.
- If no strong clinical correlation exists, write:
  "Bu soru temel fizyolojik mekanizmaya dayalıdır."

KNOWLEDGEPOINT RULES:
- Generate 6–12 KnowledgePoints.
- Each KP must be ATOMIC (exactly ONE testable fact).
- Max 180 characters per KP.
- No compound multi-claim sentences.
- Must include normalizedKeyCandidate:
    - lowercase
    - Turkish chars normalized (ı->i, ş->s, ğ->g, ü->u, ö->o, ç->c)
    - punctuation removed
    - single spaces only
- Do NOT hash (backend will hash).

KP SOURCES:
- At least 1 from spotRule
- At least 1 from mechanismChain
- At least 1 from examTrap.keyDifference
- At least 1 from clinicalCorrelation (if meaningful)
- Max 3 from optionAnalysis

OUTPUT MUST BE STRICT JSON ONLY.
No markdown.
No explanations.
No extra text.
`;

  let userPrompt = `Analyze the following TUS FİZYOLOJİ exam question and generate BOTH full analysis and atomic KnowledgePoints.\n\n`;

  userPrompt += `Question:\n${payload.question}\n\n`;

  userPrompt += `Options:\n`;
  Object.entries(payload.options).forEach(([key, value]) => {
    userPrompt += `${key}) ${value}\n`;
  });

  userPrompt += `\nCorrect Answer: ${payload.correctAnswer}\n`;

  if (payload.explanation) {
    userPrompt += `\nExisting Explanation:\n${payload.explanation}\n`;
  }

  if (payload.year) {
    userPrompt += `\nYear: ${payload.year}\n`;
  }

  if (payload.topic) {
    userPrompt += `\nPreselected Topic: ${payload.topic}\n`;
  }

  if (payload.subtopic) {
    userPrompt += `Preselected Subtopic: ${payload.subtopic}\n`;
  }

  userPrompt += `
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
      "physiologicalOutcome": "string",
      "whyWrong": "string",
      "examFrequency": "HIGH|MEDIUM|LOW",
      "importance": "HIGH|LOW"
    }
  ],
  "prerequisites": [
    {
      "label": "string",
      "conceptHints": ["string"]
    }
  ],
  "clinicalCorrelation": "string",
  "examTrap": {
    "confusedWith": "string",
    "keyDifference": "string"
  },
  "knowledgePoints": [
    {
      "fact": "string",
      "normalizedKeyCandidate": "string",
      "priority": 0,
      "examRelevance": 0.0,
      "relationshipType": "MEASURED|TRAP|CLINICAL_OUTCOME",
      "derivedFrom": {
        "field": "spotRule|mechanismChain|examTrap|clinicalCorrelation|optionAnalysis",
        "note": "string"
      }
    }
  ],
  "meta": {
    "promptVersion": "fizyoloji-v1"
  }
}

Return ONLY valid JSON.
`;

  return {
    systemPrompt,
    userPrompt,
  };
}
