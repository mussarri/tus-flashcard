export function buildQuestionCardPrompt(payload: {
  examQuestion: {
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    year: number;
    analysisPayload: any;
    patternType?: string | null;
  };
  lesson: string;
  topic?: string;
  subtopic?: string;
  prerequisiteLabels?: string[];
}): { systemPrompt: string; userPrompt: string } {
  const { examQuestion, lesson, topic, subtopic, prerequisiteLabels } = payload;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const analysis = examQuestion.analysisPayload || {};

  // Extract key analysis components with type safety
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const spotRule = analysis.spotRule || analysis.coreRule || 'Not available';
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const examTrap = analysis.examTrap || {};
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const patternType =
    analysis.patternType || examQuestion.patternType || 'GENERAL';
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const optionAnalysis = analysis.optionAnalysis || [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const prerequisites = prerequisiteLabels || analysis.prerequisites || [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const spatialContext = analysis.spatialContext || [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const clinicalCorrelation = analysis.clinicalCorrelation || null;

  const systemPrompt = `You are an AI assistant specialized in generating TUS-style educational Question Cards for a medical education platform.

Your task is to generate a Question Card that TEACHES through both the correct answer AND the incorrect options, following the "Next Question Method" pedagogy.

CRITICAL REQUIREMENTS:
1. This is a MULTIPLE-CHOICE Question Card (A–E)
2. Test ONE core anatomical/medical prerequisite concept
3. Question stem must be:
   - Exam-oriented and concise
   - Focused on the core prerequisite
   - Non-clinical (no management or treatment for anatomy)
   - Similar difficulty to the source exam question

4. There must be EXACTLY ONE correct option

OPTIONS RULES (CRITICAL):
- For INCORRECT options: Add "wouldBeCorrectIf" explanation
  - ONE sentence describing when this would be correct
  - Must be anatomy/medicine-focused
  - Must teach a conditional truth, not just negate
  - Example: "This option would be correct if the question asked about the inferior orbital fissure instead"

- For CORRECT option: NO "wouldBeCorrectIf" explanation
  - The option must clearly follow from the SPOT RULE

MAIN EXPLANATION (MANDATORY):
Write a main explanation that:
- Explicitly states the SPOT RULE
- Explains why the correct option follows from the spot rule
- Highlights the EXAM TRAP difference
- Is concise, high-yield, exam-oriented (3–5 lines max)

DIFFICULTY ASSIGNMENT:
- EASY: direct recall of spot rule (pattern confidence > 0.85)
- MEDIUM: common confusion around exam trap (0.65-0.85)
- HARD: complex topographic/compartmental anatomy (< 0.65)

OUTPUT FORMAT (STRICT JSON):
{
  "header": {
    "lesson": "{{lesson}}",
    "topic": "{{topic}}",
    "subtopic": "{{subtopic}}",
    "difficulty": "EASY | MEDIUM | HARD"
  },
  "stem": "Question text here...",
  "options": [
    {
      "key": "A",
      "text": "Option text",
      "explanation": "This option would be correct if..."
    },
    {
      "key": "B",
      "text": "Option text",
      "explanation": "This option would be correct if..."
    },
    {
      "key": "C",
      "text": "Option text",
      "isCorrect": true
    },
    {
      "key": "D",
      "text": "Option text",
      "explanation": "This option would be correct if..."
    },
    {
      "key": "E",
      "text": "Option text",
      "explanation": "This option would be correct if..."
    }
  ],
  "correctOption": "C",
  "mainExplanation": "Detailed explanation mentioning the spot rule and exam trap..."
}

IMPORTANT CONSTRAINTS:
- The SPOT RULE must be clearly recognizable in the main explanation
- Do NOT paraphrase the source ExamQuestion directly
- Do NOT include clinical management (for anatomy)
- Focus on the core prerequisite concept
- Every incorrect option MUST teach a conditional truth
- All text must be in TURKISH for Turkish medical education`;

  const userPrompt = `Generate a TUS-style Question Card based on the following analyzed exam question.

====================================
CONTEXT
====================================

LESSON: ${lesson}
${topic ? `TOPIC: ${topic}` : ''}
${subtopic ? `SUBTOPIC: ${subtopic}` : ''}

${
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  Array.isArray(prerequisites) && prerequisites.length > 0
    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
      `PREREQUISITES:\n${prerequisites.map((p) => `- ${p}`).join('\n')}`
    : ''
}

SPOT RULE (CORE FACT):
${spotRule}

${
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  examTrap.confusedWith
    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      `EXAM TRAP:\n${examTrap.confusedWith} vs ${
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        examTrap.keyDifference || 'key difference'
      }`
    : ''
}

${
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  Array.isArray(spatialContext) && spatialContext.length > 0
    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      `SPATIAL CONTEXT:\n${spatialContext.join(', ')}`
    : ''
}

${
  clinicalCorrelation
    ? `CLINICAL CORRELATION:\n${clinicalCorrelation as string}`
    : ''
}

PATTERN TYPE: ${patternType}

====================================
SOURCE EXAM QUESTION (${examQuestion.year})
====================================

${examQuestion.question}

Options:
${Object.entries(examQuestion.options)
  .map(
    ([key, value]) =>
      `${key}) ${value} ${key === examQuestion.correctAnswer ? '✓' : ''}`,
  )
  .join('\n')}

${
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  Array.isArray(optionAnalysis) && optionAnalysis.length > 0
    ? `
OPTION ANALYSIS FROM AI:
${
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  optionAnalysis
    .map(
      (opt: any) => `
Option ${opt.option as string}: ${(opt.structure as string) || (opt.text as string) || ''}
- Would be correct if: ${(opt.wouldBeCorrectIf as string) || 'N/A'}
- Confusion risk: ${(opt.confusionRisk as string) || 'N/A'}
- Clinical outcome: ${(opt.clinicalOutcome as string) || 'N/A'}
`,
    )
    .join('\n')
}`
    : ''
}

====================================
YOUR TASK
====================================

Generate a NEW Question Card that:
1. Tests the SAME core prerequisite/spot rule
2. Uses a DIFFERENT scenario or framing than the source question
3. Includes detailed "wouldBeCorrectIf" explanations for EACH incorrect option
4. Provides a main explanation that teaches the spot rule and exam trap

CRITICAL: Do NOT copy the source question. Create a NEW question that tests the same concept differently.

Return ONLY valid JSON matching the exact format specified in the system prompt.`;

  return { systemPrompt, userPrompt };
}
