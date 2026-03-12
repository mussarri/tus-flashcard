export function buildKnowledgeExtractionPrompt(payload: {
  content: string;
  lesson?: string;
  repairRawOutput?: string;
  maxKnowledgePoints?: number;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS odaklı knowledge point çıkarım motorusun.

Görevin:
- Verilen içerikten sınav ve öğrenme açısından anlamlı knowledge point'ler çıkar.
- Sadece verilen içerikten üret.
- Sadece geçerli JSON döndür.
- Markdown kullanma.
- Açıklama yazma.

Knowledge point kuralları:
- knowledgePoints[].fact Türkçe olmalı.
- Her knowledge point tek bir ana fikri taşımalıdır.
- Aşırı atomik parçalama yapma.
- Bir knowledge point gerektiğinde 1 veya 2 cümle olabilir.
- Aynı bilginin ayrılmaz parçaları birlikte tutulabilir.
- Ancak birbirinden bağımsız iki ayrı bilgi tek knowledge point içinde birleştirilmemelidir.
- Uzun liste, çok maddeli sayım, paragraf özeti üretme.
- Tanım + temel klinik önem, yapı + temel fonksiyon, neden + tipik sonuç gibi doğal olarak bağlı içerikler aynı knowledge point içinde olabilir.
- Ayrı flashcard gerektirecek kadar bağımsız bilgiler ayrılmalıdır.

Önceliklendirme:
- priority: 0-10 integer
- examRelevance: 0-1 number
- classificationConfidence: 0-1 number

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

  const userPrompt = `Ders: ${payload.lesson || 'Bilinmiyor'}

Aşağıdaki içerikten en fazla ${payload.maxKnowledgePoints || 15} adet knowledge point üret.

İçerik:
${payload.content}

Kurallar:
- Sadece JSON döndür.
- fact alanı Türkçe olsun.
- Her knowledge point tek bir ana fikir taşısın.
- fact çoğunlukla 1 cümle olsun; gerekirse 2 cümle olabilir.
- Çok yakın ve ayrılmaz bilgiler aynı knowledge point içinde kalabilir.
- Birbirinden bağımsız bilgiler ayrı knowledge point yapılmalıdır.
- Gereksiz aşırı parçalama yapma.
- priority 0-10 integer olsun.
- examRelevance 0-1 olsun.
- classificationConfidence 0-1 olsun.`;

  return { systemPrompt, userPrompt };
}
