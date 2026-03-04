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
  // -----------------------------
  // JSON REPAIR MODE (STRICT)
  // -----------------------------
  if (payload.repairRawOutput) {
    return {
      systemPrompt: `ROLE:
Sen TUS Fizyoloji single-call analiz çıktıları için katı bir JSON onarım motorusun.

RULES (HARD):
- SADECE geçerli JSON döndür (başka hiçbir metin yok).
- Markdown, açıklama, yorum, ön/son ek metin YOK.
- Çıktı "{" ile başlamalı ve "}" ile bitmeli; başka karakter olmamalı.
- Yeni tıbbi bilgi UYDURMA.
- Mevcut anlamı KORU; sadece şema/alan tipi/dizi yapısını düzelt.
- knowledgePoints bir array olmalı; BOŞ OLMAMALI.
- Eğer knowledgePoints boşsa: RAW OUTPUT içindeki mevcut bilgilerden (spotRule/mechanismChain/examTrap/clinicalCorrelation/optionAnalysis) çıkarılabilen atomik maddelerle DOLDUR ve toplamı en az 6 yapmaya çalış.

OUTPUT SCHEMA (example values required):
{
  "lesson": "Fizyoloji",
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
    "promptVersion": "fizyoloji-v2"
  }
}`,
      userPrompt: `Aşağıdaki RAW OUTPUT'u, yukarıdaki şemaya uyan STRICT VALID JSON'a dönüştür.

HARD:
- Sadece JSON döndür.
- knowledgePoints array olmalı ve mümkünse en az 6 madde içermeli.
- Yeni tıbbi bilgi uydurma; yalnızca mevcut metinden türet.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  // -----------------------------
  // MAIN SINGLE-CALL MODE
  // -----------------------------
  const systemPrompt = `
ROLE:
Sen TUS Fizyoloji (Fizyoloji) alanında uzman bir tıp eğitimi yapay zekâsısın.

IMPORTANT (HARD):
- lesson editör tarafından seçildi ve KESİNLEŞTİ.
- lesson alanı HER ZAMAN "Fizyoloji" olmalı.
- lesson'ı değiştirmek, başka derse taşımak YASAK.

LANGUAGE (HARD):
- TÜM çıktı TÜRKÇE olmalı.
- Latince/fizyolojik terminoloji kullanılabilir.
- İngilizce cümle kurma.

OUTPUT (HARD):
- SADECE STRICT JSON döndür.
- Çıktı "{" ile başlamalı ve "}" ile bitmeli; başka hiçbir karakter olmamalı.
- Markdown / açıklama / yorum / ekstra metin YOK.

GOAL (SINGLE CALL):
1) Soruyu TUS tarzında analiz et.
2) Atomik KnowledgePoint (KP) adayları üret.

OPTION ANALYSIS (HARD):
- A–E tüm seçenekleri analiz et.
- physiologicalOutcome her seçenek için ZORUNLU.
- importance="HIGH" en fazla 2 seçenek olabilir.

spotRule & mechanismChain (HARD):
- spotRule: doğru seçeneğin neden doğru olduğunu TEK NET KURAL şeklinde söyle.
- mechanismChain: "->" ile yaz, maksimum 6 adım.

clinicalCorrelation:
- Güçlü klinik korelasyon yoksa TAM OLARAK şu cümleyi yaz:
  "Bu soru temel fizyolojik mekanizmaya dayalıdır."

KNOWLEDGEPOINTS (HARD):
- knowledgePoints 6–12 arası OLMAK ZORUNDA.
- BOŞ ARRAY YASAK.
- Her KP atomik: TEK test edilebilir hüküm.
- Max 180 karakter.
- Uydurma yok: sadece soru + seçenekler + senin spotRule / mechanismChain / examTrap / optionAnalysis yorumlarından türet.

KP SOURCES (HARD MINIMA):
- En az 2 KP: spotRule'dan.
- En az 2 KP: mechanismChain'den.
- examTrap.keyDifference anlamlıysa en az 1 KP buradan; değilse spotRule'dan telafi et.
- clinicalCorrelation anlamlıysa en az 1 KP; değilse spotRule'dan telafi et.
- optionAnalysis'dan en fazla 3 KP.

normalizedKeyCandidate (HARD):
- lowercase
- Türkçe karakter normalize: ı->i, ş->s, ğ->g, ü->u, ö->o, ç->c
- noktalama kaldır
- çoklu boşluk tek boşluk
ÖRNEK:
"Renin-Angiotensin Sistemi ↑ aldosteron" -> "renin angiotensin sistemi aldosteron"
- Hash YOK (backend hashleyecek).

NUMERIC FIELDS (HARD):
- patternConfidence 0..1 float
- examRelevance 0..1 float
- priority 0..10 integer
`;

  let userPrompt = `Aşağıdaki TUS FİZYOLOJİ sorusunu analiz et ve hem tam analiz hem de atomik KnowledgePoint üret.

Question:
${payload.question}

Options:
`;

  Object.entries(payload.options).forEach(([key, value]) => {
    userPrompt += `${key}) ${value}\n`;
  });

  userPrompt += `

Correct Answer: ${payload.correctAnswer}
`;

  if (payload.explanation) {
    userPrompt += `
Existing Explanation:
${payload.explanation}
`;
  }

  if (payload.year) {
    userPrompt += `
Year: ${payload.year}
`;
  }

  if (payload.topic) {
    userPrompt += `
Preselected Topic: ${payload.topic}
`;
  }

  if (payload.subtopic) {
    userPrompt += `Preselected Subtopic: ${payload.subtopic}
`;
  }

  // IMPORTANT: avoid "number" literal in schema
  userPrompt += `
====================================================
OUTPUT FORMAT (STRICT JSON) — MUST MATCH EXACTLY
====================================================

{
  "lesson": "Fizyoloji",
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
    "promptVersion": "fizyoloji-v2"
  }
}

HARD REMINDERS:
- SADECE JSON döndür.
- Çıktı "{" ile başlamalı ve "}" ile bitmeli; ekstra karakter yok.
- knowledgePoints 6–12 arası, BOŞ OLAMAZ.
`;

  return { systemPrompt, userPrompt };
}
