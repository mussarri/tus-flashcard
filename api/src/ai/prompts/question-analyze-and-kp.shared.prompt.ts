export interface LessonSingleCallPayload {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  year?: number;
  lesson: string;
  topic?: string;
  subtopic?: string;
  repairRawOutput?: string;
}

interface PromptConfig {
  lessonName: string;
  promptVersion: string;
}

export function buildLessonSingleCallPrompt(
  payload: LessonSingleCallPayload,
  config: PromptConfig,
): { systemPrompt: string; userPrompt: string } {
  const { lessonName, promptVersion } = config;

  if (payload.repairRawOutput) {
    return {
      systemPrompt: `ROLE:
Sen TUS ${lessonName} single-call analiz ciktilari icin kati bir JSON onarim motorusun.

RULES (HARD):
- SADECE gecerli JSON dondur (baska hicbir metin yok).
- Markdown, aciklama, yorum, on/son ek metin YOK.
- Cikti "{" ile baslamali ve "}" ile bitmeli; baska karakter olmamali.
- Yeni tibbi bilgi UYDURMA.
- Mevcut anlami KORU; sadece sema/alan tipi/dizi yapisini duzelt.
- knowledgePoints bir array olmali; BOS OLMAMALI.
- Eğer knowledgePoints bossa: RAW OUTPUT icindeki mevcut bilgilerden atomik maddeler cikart ve toplam en az 6 olmaya calis.

OUTPUT SCHEMA:
{
  "lesson": "${lessonName}",
  "topic": "string",
  "subtopic": "string",
  "patternType": "string",
  "patternConfidence": 0.0,
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
    "promptVersion": "${promptVersion}"
  }
}`,
      userPrompt: `Asagidaki RAW OUTPUT'u, yukaridaki semaya uyan STRICT VALID JSON'a donustur.

HARD:
- Sadece JSON dondur.
- knowledgePoints array olmali ve mumkunse en az 6 madde icermeli.
- Yeni tibbi bilgi uydurma; yalnizca mevcut metinden turet.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  const systemPrompt = `
ROLE:
Sen TUS ${lessonName} alaninda uzman bir tip egitimi yapay zekasisin.

IMPORTANT (HARD):
- lesson editor tarafindan secildi ve KESINLESTI.
- lesson alani HER ZAMAN "${lessonName}" olmali.
- lesson'i degistirmek, baska derse tasimak YASAK.

LANGUAGE (HARD):
- TUM cikti TURKCE olmali.
- Tip terminolojisi kullanilabilir.

OUTPUT (HARD):
- SADECE STRICT JSON dondur.
- Cikti "{" ile baslamali ve "}" ile bitmeli; baska hicbir karakter olmamali.
- Markdown / aciklama / yorum / ekstra metin YOK.

GOAL (SINGLE CALL):
1) Soruyu TUS tarzinda analiz et.
2) Atomik KnowledgePoint (KP) adaylari uret.

OPTION ANALYSIS (HARD):
- A-E tum secenekleri analiz et.
- Her secenek icin "whyWrong" ve "importance" alanlari dolu olmali.

SPOT RULE & MECHANISM:
- spotRule: dogru secenegin neden dogru oldugunu tek net kural olarak yaz.
- mechanismChain: nedeni-sonucu "->" ile yaz (maksimum 6 adim).

CLINICAL CORRELATION:
- Guclu klinik korelasyon yoksa tam olarak su cumleyi yaz:
  "Bu soru temel mekanizmaya dayalidir."

KNOWLEDGEPOINTS (HARD):
- knowledgePoints 6-12 arasi OLMALI.
- BOS ARRAY YASAK.
- Her KP atomik: tek test edilebilir hukum.
- Her KP en fazla 180 karakter.
- Uydurma yok: sadece soru + secenekler + spotRule / mechanismChain / examTrap / optionAnalysis yorumlarindan turet.

NORMALIZED KEY (HARD):
- lowercase
- Turkce karakter normalize: i, s, g, u, o, c
- noktalama kaldir
- coklu bosluk tek bosluk
- hash URETME.

NUMERIC FIELDS (HARD):
- patternConfidence 0..1 float
- examRelevance 0..1 float
- priority 0..10 integer
`;

  let userPrompt = `Asagidaki TUS ${lessonName} sorusunu analiz et ve hem analiz hem de atomik KnowledgePoint uret.\n\nQuestion:\n${payload.question}\n\nOptions:\n`;

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

OUTPUT FORMAT (STRICT JSON)
{
  "lesson": "${lessonName}",
  "topic": "string",
  "subtopic": "string",
  "patternType": "string",
  "patternConfidence": 0.0,
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
    "promptVersion": "${promptVersion}"
  }
}

HARD REMINDERS:
- SADECE JSON dondur.
- Cikti "{" ile baslayip "}" ile bitmeli.
- knowledgePoints 6-12 arasi, BOS OLAMAZ.
`;

  return { systemPrompt, userPrompt };
}
