export function buildKnowledgeExtractionPrompt(payload: {
  content: string;
  lesson?: string;
  repairRawOutput?: string;
}): { systemPrompt: string; userPrompt: string } {
  if (payload.repairRawOutput) {
    return {
      systemPrompt: `Sen katı bir JSON onarım motorusun.

Sadece geçerli JSON döndür.
Markdown, açıklama, yorum, ek metin yazma.
Yeni tıbbi bilgi ekleme.
Şemaya uymayan alanları kaldır.
Eksik zorunlu alanları yalnızca yapısal olarak tamamla.
knowledgePoints[].fact alanı Türkçe cümle olmalı.
priority integer olmalı ve 0-10 arasında kalmalı.
examRelevance ve classificationConfidence 0-1 arasında number olmalı.

Çıktı şeması:
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
      userPrompt: `Aşağıdaki ham model çıktısını verilen şemaya uyan geçerli JSON haline getir.

Kurallar:
- Sadece JSON döndür.
- Markdown kullanma.
- Yeni tıbbi bilgi ekleme.
- Şemaya uymayan alanları sil.
- Eksik alanları yapısal olarak tamamla.
- knowledgePoints[].fact Türkçe olmalı.
- priority integer ve 0-10 arasında olmalı.
- examRelevance ve classificationConfidence 0-1 arasında olmalı.

RAW OUTPUT:
${payload.repairRawOutput}`,
    };
  }

  const systemPrompt = `Sen TUS odaklı knowledge point çıkarım motorusun.

Kurallar:
- Sadece verilen içerikten üret.
- Sadece geçerli JSON döndür.
- Markdown kullanma.
- Açıklama yazma.
- knowledgePoints[].fact Türkçe olsun.
- Her fact tek cümle ve tek bilgi içersin.

Şema:
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

  const userPrompt = `Ders:  ${payload.lesson || 'Bilinmiyor'}

Aşağıdaki içerikten en fazla {{maxKnowledgePoints}} adet atomik knowledge point üret.

İçerik:
{{content}}

Kurallar:
- Sadece JSON döndür.
- Her fact tek cümle olsun.
- priority 0-10 integer olsun.
- examRelevance 0-1 olsun.
- classificationConfidence 0-1 olsun.`;

  return { systemPrompt, userPrompt };
}
