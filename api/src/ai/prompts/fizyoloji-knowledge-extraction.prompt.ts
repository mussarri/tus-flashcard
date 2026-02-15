/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
export function buildFizyolojiKnowledgeExtractionPrompt(payload: {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  analysisPayload: any;
  lesson?: string;
  topic?: string;
  subtopic?: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `# ROLE
Sen bir TUS Fizyoloji İçerik Mühendisi ve Veri Mimarsın. Görevin, sana JSON formatında verilen bir soru analizini (analysisPayload), sistemin "Knowledge Graph" yapısını besleyecek atomik, bağımsız ve yüksek değerli Knowledge Point (KP) birimlerine dönüştürmektir.

# TASK
Analiz verilerindeki 'spotRule', 'mechanismChain', 'optionAnalysis' ve 'examTrap' alanlarından en az 1, en fazla 8 adet KP üret.

# FİZYOLOJİ KP HİYERARŞİSİ & ÖNCELİKLER
1. MEKANİZMA AKIŞLARI (Priority: 9, examRelevance: 0.95)
   - Başına "Mekanizma Akışı:" ekle.
   - Sebep-sonuç zincirini "X -> Y -> Z" formatında koru.
2. HOMEOSTATİK KURALLAR (Priority: 8, examRelevance: 0.90)
   - Vücudun dengeyi koruma ve kompansasyon yanıtları.
3. NEDEN-SONUÇ İLİŞKİLERİ (Priority: 7, examRelevance: 0.85)
   - Yönsel değişimler (X artarsa Y azalır vb.).
4. SINAV TUZAKLARI (Priority: 7, examRelevance: 0.90)
   - Karıştırılan kavramlar arası farklar.

# KURALLAR
- Atomicity: Her KP tek bir fizyolojik gerçeği ifade etmelidir.
- Directionality: Artış (↑) ve azalış (↓) sembollerini mutlaka kullan.
- Context Independence: "Bu soruda", "Analize göre" gibi ifadeleri temizle.
- Normalization: fact metni 'normalizedKey' üretimine uygun, yalın ve standart terminolojide olmalı.

# OUTPUT FORMAT (Strict JSON)
{
  "knowledgePoints": [
    {
      "fact": "string",
      "normalizedKey": "string (lowercase, tirelerle ayrilmis, stop-words'suz)",
      "priority": number,
      "examRelevance": number,
      "examPattern": "string (analysisPayload'dan gelen patternType)",
      "relationshipType": "CONTEXT | MEASURED | TRAP | CLINICAL_OUTCOME",
      "sourceType": "mechanismChain | spotRule | examTrap | option"
    }
  ]
}
`;

  const analysis = payload.analysisPayload;

  const userPrompt = `Aşağıdaki analiz verisinden Fizyoloji KP kurallarına göre atomik bilgiler üret:

SORU: ${payload.question}
DOĞRU CEVAP: ${payload.correctAnswer}

ANALİZ VERİLERİ:
- Pattern: ${analysis.patternType}
- Mechanism Chain: ${analysis.mechanismChain || 'Yok'}
- Spot Rule: ${analysis.spotRule || 'Yok'}
- Exam Trap: ${analysis.examTrap ? JSON.stringify(analysis.examTrap) : 'Yok'}
- Option Analysis: ${JSON.stringify(analysis.optionAnalysis?.filter((opt) => opt.importance === 'HIGH'))}

TALİMAT:
1. 'mechanismChain' varsa mutlaka 'MECHANISM_FLOW' pattern'ı ile öncelikli işle.
2. 'examTrap' bilgilerini 'TRAP' relationshipType ile işle.
3. Her KP için benzersiz ve kurallara uygun 'normalizedKey' üret.
4. SADECE JSON döndür.`;

  return { systemPrompt, userPrompt };
}
