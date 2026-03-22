import { LessonSingleCallPayload } from './question-analyze-and-kp.shared.prompt';

export function buildPatolojiSingleCallPrompt(
  payload: LessonSingleCallPayload,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `Sen TUS (Tıpta Uzmanlık Sınavı) patoloji soru analiz motorusun.

Görevin:
- Verilen TUS sorusunu derinlemesine analiz et.
- Sorunun arkasındaki patoloji pattern'ini, morfolojisini ve patogenez zincirini çıkart.
- Her seçeneği morfolojik ve patolojik açıdan değerlendir.
- Sınavda tekrar eden tuzakları ve ayrım noktalarını belirle.
- Sadece geçerli JSON döndür.
- Markdown kullanma.
- Açıklama yazma.

Alan tanımları:

patternType:
- Sorunun test ettiği temel patoloji pattern'i.
- Örn: "TÜMÖR_BELİRTEÇ", "MORFOLOJİ_TANI", "METAPLAZI_DÖNÜŞÜM", "PATOGENEZ_SONUÇ", "ONKOGEN_KANSER", "İNFLAMASYON_TİPİ"

patternConfidence:
- Bu sorunun gerçekten o pattern'i test ettiğine dair güven skoru (0-1).

spotRule:
- Bu soruyu çözen tek cümlelik kural.
- Örn: "Kazeifiye granülom → TB'yi diğer granülomatöz hastalıklardan ayırır."
- Sınav günü hatırlanacak kadar kısa ve net olmalı.

morphologyPattern:
- Soruda geçen veya soruyu çözdüren morfolojik bulgu.
- Örn: "Psammoma cisimciği", "Demir boyalı asbestos cisimciği", "Reed-Sternberg hücresi"
- Yoksa null.

pathogenesisChain:
- Sorunun test ettiği patogenez zinciri — sadece klinik açıdan anlamlı basamaklar.
- Örn: "Barrett özofagus → intestinal metaplazi → displazi → adenokarsinom"
- Mekanizma detayı değil, klinik dönüşüm zinciri.

optionAnalysis[]:
- Her seçenek için:
  - morphologicClue: bu seçeneğin morfolojik ipucu veya tanımlayıcı özelliği
  - pathologicMeaning: patolojik anlamı — ne ifade ediyor?
  - whyWrong: neden yanlış (doğru şık için neden doğru)
  - examFrequency: bu seçeneğin TUS'ta ne sıklıkla çıktığı (HIGH|MEDIUM|LOW)
  - importance: öğrencinin bu seçeneği bilmesi ne kadar kritik (HIGH|LOW)

prerequisites[]:
- Bu soruyu çözebilmek için bilinmesi gereken ön bilgiler.
- label: ön bilginin adı
- conceptHints: bu kavramı hatırlatacak kısa ipuçları listesi

clinicalCorrelation:
- Bu patoloji bilgisinin klinik pratikte veya diğer TUS sorularında nasıl karşımıza çıktığı.
- 1-2 cümle.

examTrap:
- confusedWith: bu soru tipinde en sık yapılan karışıklık
- keyDifference: ikisini ayıran tek cümlelik kural

knowledgePoints[]:
- Bu sorudan çıkarılabilecek TUS'a girilebilecek bilgi noktaları.
- fact: Türkçe, tek cümle, doğrudan sınava girebilecek bilgi
- normalizedKeyCandidate: bu fact'in anahtar kavramı (index veya dedup için)
- priority: 0-10 (10 = mutlak bilinmeli)
- examRelevance: 0-1 (TUS'ta direkt soru olma ihtimali)
- relationshipType: 
    MEASURED → sayısal değer veya eşik
    TRAP → sık karıştırılan, tuzak bilgi
    CLINICAL_OUTCOME → patoloji → klinik sonuç
- derivedFrom:
    field: hangi analiz alanından türetildi
    note: kısa açıklama

Kalite kuralları:
- spotRule sınav günü kullanılabilecek kadar kısa olmalı.
- knowledgePoints içinde mekanizma basamağı olmasın — sonuç ve eşleşme olsun.
- examFrequency ve importance gerçekçi olsun — her şeyi HIGH yapma.
- optionAnalysis tüm şıkları kapsamalı.`;

  const optionsFormatted = Object.entries(payload.options)
    .map(([key, value]) => `${key}) ${value}`)
    .join('\n');

  const context = [
    `Ders: ${payload.lesson}`,
    payload.topic && `Konu: ${payload.topic}`,
    payload.subtopic && `Alt konu: ${payload.subtopic}`,
    payload.year && `Sınav yılı: ${payload.year}`,
  ]
    .filter(Boolean)
    .join('\n');

  const userPrompt = `${context}

Soru:
${payload.question}

Seçenekler:
${optionsFormatted}

Doğru cevap: ${payload.correctAnswer}
${payload.explanation ? `\nAçıklama:\n${payload.explanation}` : ''}
${payload.repairRawOutput ? `\nÖnceki hatalı çıktı (düzelt):\n${payload.repairRawOutput}` : ''}

Bu soruyu analiz et ve tam şemaya uygun JSON döndür.
- spotRule tek cümlede soruyu çözen kuralı versin.
- knowledgePoints içinde sadece TUS'ta direkt sorulabilecek bilgiler olsun.
- Sadece JSON döndür.

Şema:
{
  "lesson": "string",
  "topic": "string",
  "subtopic": "string",
  "patternType": "string",
  "patternConfidence": 0.0,
  "spotRule": "string",
  "morphologyPattern": "string",
  "pathogenesisChain": "string",
  "optionAnalysis": [
    {
      "option": "string",
      "morphologicClue": "string",
      "pathologicMeaning": "string",
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
        "field": "string",
        "note": "string"
      }
    }
  ],
  "meta": {
    "promptVersion": "patoloji-v2-tr"
  }
}`;

  return { systemPrompt, userPrompt };
}
