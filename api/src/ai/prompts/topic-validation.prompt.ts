/**
 * Topic/Subtopic Validation Prompt
 * Helps admins decide if a proposed topic/subtopic should be created
 */

export function buildTopicValidationPrompt(params: {
  lesson: string;
  proposedName: string;
  parentTopic?: string;
  existingTopics?: string[];
  existingSubtopics?: string[];
}): string {
  const { lesson, proposedName, parentTopic, existingTopics, existingSubtopics } =
    params;

  return `You are an ontology assistant for TUS (Turkish Medical Specialty Exam).

The admin is trying to CREATE a new ${parentTopic ? 'SUBTOPIC' : 'TOPIC'}.

====================================================
INPUT
====================================================

Lesson: ${lesson}
Proposed Name: "${proposedName}"
${parentTopic ? `Parent Topic: "${parentTopic}"` : ''}

${existingTopics?.length ? `\nExisting Topics in ${lesson}:\n${existingTopics.map((t) => `- ${t}`).join('\n')}` : ''}

${existingSubtopics?.length && parentTopic ? `\nExisting Subtopics under "${parentTopic}":\n${existingSubtopics.map((s) => `- ${s}`).join('\n')}` : ''}

====================================================
YOUR TASK
====================================================

Decide whether this should be:
- TOPIC: A high-level anatomical region or system
- SUBTOPIC: A logical subdivision of a topic  
- REJECT: Duplicate, too specific, or inappropriate

====================================================
RULES
====================================================

✓ GOOD TOPICS:
- Anatomical regions (e.g., "Üst Ekstremite", "Abdomen")
- Organ systems (e.g., "Sinir Sistemi", "Dolaşım Sistemi")
- Clinical domains (e.g., "Kalp Hastalıkları", "Diyabet")

✓ GOOD SUBTOPICS:
- Logical subdivisions (e.g., "Kaslar", "Damarlar" under "Üst Ekstremite")
- Clinical categories (e.g., "Tanı", "Tedavi" under a disease)
- Anatomical subregions (e.g., "Ön Kol", "El" under "Üst Ekstremite")

✗ REJECT IF:
- Duplicate or very similar to existing topic/subtopic
- Question-specific phrases (e.g., "... soruları", "... sınavı")
- Action-oriented (e.g., "seyri", "innervasyonu" as standalone)
- Exam tricks or study techniques
- Too granular (e.g., specific muscle names as topics)
- Vague or unclear naming

====================================================
ADDITIONAL CONTEXT
====================================================

- Prefer fewer, stable topics that will last across exam years
- Topics should be curriculum-aligned
- Turkish medical terminology is standard
- Subtopics should meaningfully divide their parent topic

====================================================
OUTPUT FORMAT (STRICT JSON)
====================================================

Respond with ONLY a JSON object in this exact format:

{
  "decision": "TOPIC" | "SUBTOPIC" | "REJECT",
  "reason": "One short sentence explaining your decision (max 15 words)",
  "confidence": 0.0 to 1.0,
  "suggestion": "Optional alternative name if rejecting or improving"
}

Examples:

Input: "Kalp Anatomisi" (no parent)
Output: {"decision": "TOPIC", "reason": "Clear anatomical system, curriculum-aligned", "confidence": 0.95}

Input: "Kaslar" (parent: "Üst Ekstremite")  
Output: {"decision": "SUBTOPIC", "reason": "Logical anatomical subdivision of upper extremity", "confidence": 0.9}

Input: "n. radialis innervasyonu" (parent: "Üst Ekstremite")
Output: {"decision": "REJECT", "reason": "Too specific, should be covered under nerves subtopic", "confidence": 0.85, "suggestion": "Sinirler"}

Input: "Kalp" (existing topic: "Kalp Anatomisi")
Output: {"decision": "REJECT", "reason": "Duplicate of existing topic Kalp Anatomisi", "confidence": 0.95}

Now evaluate the proposed name above and respond with JSON only.`;
}
