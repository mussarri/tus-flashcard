export function buildKnowledgeExtractionPrompt(payload: {
  content: string;
  contentType?: string;
  blockType?: string;
  lesson?: string;
  topic?: string;
  subtopic?: string;
  maxKnowledgePoints?: number;
  strategyHint?: string;
  tableData?: unknown;
  algorithmData?: unknown;
  repairRawOutput?: string;
}): { systemPrompt: string; userPrompt: string } {
  // --- JSON repair mode ---
  if (payload.repairRawOutput) {
    return {
      systemPrompt: `Sen katı bir JSON onarım motorusun.
Sadece geçerli JSON döndür. Yorum ekleme.
Gerçek olmayan bilgi uydurma.
DİL ZORUNLULUĞU: knowledgePoints[].fact cümleleri TÜRKÇE olmalı (terimler Latin/İngilizce geçebilir).

Output schema:
{
  "knowledgePoints": [
    {
      "fact": "string",
      "priority": 0,
      "examRelevance": 0,
      "classificationConfidence": 0
    }
  ]
}`,
      userPrompt: `Aşağıdaki model çıktısını, şemaya uyan **katı geçerli JSON** haline getir.

KURALLAR:
- Sadece JSON döndür (markdown yok).
- Şemaya uymayan alanları kaldır.
- Eksik alanları varsa, şemaya uygun şekilde TAMAMLA ama yeni tıbbi bilgi UYDURMA.
- knowledgePoints[].fact TÜRKÇE olmalı.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  // --- normal extraction mode ---
  const systemPrompt = `BİLGİ NOKTASI (KNOWLEDGE POINT) ÜRETİCİ - ANA PROMPT

Sen onaylı tıbbi içerikten, sınavda ölçülebilir, atomik KnowledgePoint'ler çıkarırsın.
Sadece verilen girdiyi kullan. Harici tıbbi bilgi EKLEME.

DİL ZORUNLULUĞU (ÇOK ÖNEMLİ):
- ÇIKTI DİLİ: TÜRKÇE.
- knowledgePoints[].fact mutlaka Türkçe cümle olmalı.
- Tıbbi terimler Latin/İngilizce geçebilir (örn. "foramen ovale", "Broca alanı") ama cümle yapısı Türkçe olmalı.

Genel kurallar:
- Atomiklik: "fact" alanı tek bir ölçülebilir iddia içermeli (tek cümle / tek hüküm)
- Deterministik stil, kısa ve net ifadeler
- Sınav odaklı (TUS refleksi) çıktılar
- Sadece strict JSON döndür (başka hiçbir metin yok)
- Maksimum çıktı sayısı maxKnowledgePoints değerini aşamaz

Block tipine göre:
- TEXT: cümle-seviyesi atomik iddialar
- SPOT: 1-5 yüksek verimli (high-yield) iddia
- ALGORITHM: karar / eşik / geçiş (if-then, threshold) iddiaları
- TABLE: anti-explosion davranışı

TABLE anti-explosion kuralları:
- rowCount > 20 VEYA colCount > 4 ise: PATTERN_ONLY modu
- PATTERN_ONLY: 1-6 desen/pattern bilgisi + (opsiyonel) seçilmiş satır bilgileri (toplam <= 16)
- Tablo tipleri: DIRECT_FACT, DIAGNOSTIC_CRITERIA, COMPARISON, ENUMERATION, MECHANISM_FLOW, MIXED_OR_UNKNOWN
- Hücre-hücre patlaması yapma; kapsamlara uy

ÇIKTI ŞEMASI (strict):
{
  "knowledgePoints": [
    {
      "fact": "string",
      "priority": 0,
      "examRelevance": 0,
      "classificationConfidence": 0
    }
  ]
}`;

  let userPrompt = `Girdi içerik:\n${payload.content}`;

  userPrompt += `\n\nBağlam:`;
  userPrompt += `\n- blockType: ${payload.blockType ?? 'TEXT'}`;
  userPrompt += `\n- contentType: ${payload.contentType ?? 'UNKNOWN'}`;
  userPrompt += `\n- lesson: ${payload.lesson ?? 'UNKNOWN'}`;
  userPrompt += `\n- topic: ${payload.topic ?? 'UNKNOWN'}`;
  userPrompt += `\n- subtopic: ${payload.subtopic ?? 'UNKNOWN'}`;
  userPrompt += `\n- maxKnowledgePoints: ${payload.maxKnowledgePoints ?? 50}`;
  userPrompt += `\n- strategyHint: ${payload.strategyHint ?? 'DEFAULT'}`;

  if (payload.tableData) {
    userPrompt += `\n- tableData: ${JSON.stringify(payload.tableData)}`;
  }

  if (payload.algorithmData) {
    userPrompt += `\n- algorithmData: ${JSON.stringify(payload.algorithmData)}`;
  }

  userPrompt += `\n\nKesin kısıtlar:`;
  userPrompt += `\n- Sadece geçerli JSON döndür (başka metin yok).`;
  userPrompt += `\n- Markdown code fence kullanma.`;
  userPrompt += `\n- knowledgePoints[].fact TÜRKÇE olmalı (terimler Latin/İngilizce geçebilir).`;
  userPrompt += `\n- examRelevance ve classificationConfidence 0-1 arasında olmalı.`;
  userPrompt += `\n- priority 0-10 arası integer olmalı.`;

  return { systemPrompt, userPrompt };
}
