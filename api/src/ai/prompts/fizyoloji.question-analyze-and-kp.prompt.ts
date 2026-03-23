import { LessonSingleCallPayload } from './question-analyze-and-kp.shared.prompt';

export function buildFizyolojiSingleCallPrompt(
  payload: LessonSingleCallPayload,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `Sen TUS (Tıpta Uzmanlık Sınavı) fizyoloji soru analiz motorusun.

Görevin:
- Verilen TUS sorusunu fizyoloji perspektifinden derinlemesine analiz et.
- Sorunun arkasındaki fizyolojik mekanizma, kompanzasyon ve klinik bağlantıyı çıkart.
- Her seçeneği fizyolojik açıdan değerlendir.
- Sadece geçerli JSON döndür.
- Markdown kullanma.
- Açıklama yazma.

Alan tanımları:

patternType:
- Sorunun test ettiği temel fizyoloji pattern'i.
- Örn: "KOMPANZASYON_MEKANİZMASI", "REFERANS_DEĞER", "HORMON_ETKİ", "KLİNİK_SONUÇ", "HOMEOSTAZ_BOZULMA", "REFLEKS_YAY"

patternConfidence:
- Bu sorunun gerçekten o pattern'i test ettiğine dair güven skoru (0-1).

spotRule:
- Bu soruyu çözen tek cümlelik kural.
- Mekanizma değil, net sonuç: "X → Y olur."
- Örn: "ACEi → efferent dilate → GFR düşer → proteinüri azalır."

physiologyChain:
- Soruyu çözdüren fizyolojik zincir — sadece klinik açıdan anlamlı basamaklar.
- Maksimum 4 basamak. Ara iyon kanalı detayı ekleme.
- Örn: "Hiperventilasyon → CO2 düşer → respiratuar alkaloz → kompanzasyon: HCO3 atılır"
- Yoksa null.

compensationMechanism:
- Soruda geçen veya soruyu çözdüren kompanzasyon mekanizması.
- Format: "Bozulma → Kompanzasyon → Net etki"
- Örn: "Metabolik asidoz → hiperventilasyon → pH kısmen düzelir"
- Yoksa null.

referenceValues:
- Soruda geçen veya soruyu çözdüren normal referans değerler.
- Her biri: { parameter, normalRange, unit, clinicalNote }
- Örn: { parameter: "GFR", normalRange: "90-120", unit: "mL/dk", clinicalNote: "60 altı → KBH" }
- Yoksa boş array [].

hormoneTable:
- Soruda geçen hormon varsa: hormon → hedef organ → net etki.
- Her biri: { hormone, target, effect }
- Örn: { hormone: "ADH", target: "Toplayıcı kanal", effect: "Serbest su reabsorpsiyonu artar" }
- Yoksa boş array [].

clinicalCorrelation:
- Bu fizyoloji bilgisinin hangi klinik hastalıkta veya TUS sorusunda karşımıza çıktığı.
- 1-2 cümle, klinik bağlantı net olsun.

optionAnalysis[]:
- Her seçenek için:
  - physiologicClue: bu seçeneğin fizyolojik ipucu veya tanımlayıcı özelliği
  - mechanismMeaning: fizyolojik mekanizma açısından ne ifade ediyor?
  - whyWrong: neden yanlış (doğru şık için neden doğru)
  - examFrequency: bu seçeneğin TUS'ta ne sıklıkla çıktığı (HIGH|MEDIUM|LOW)
  - importance: öğrencinin bu seçeneği bilmesi ne kadar kritik (HIGH|LOW)

prerequisites[]:
- Bu soruyu çözebilmek için bilinmesi gereken ön bilgiler.
- label: ön bilginin adı
- conceptHints: bu kavramı hatırlatacak kısa ipuçları listesi

examTrap:
- confusedWith: bu soru tipinde en sık yapılan karışıklık
- keyDifference: ikisini ayıran tek cümlelik kural

knowledgePoints[]:
- Bu sorudan çıkarılabilecek TUS'a girebilecek bilgi noktaları.
- fact: Türkçe, tek cümle, doğrudan sınava girebilecek bilgi
- normalizedKeyCandidate: bu fact'in anahtar kavramı
- priority: 0-10 (10 = mutlak bilinmeli)
- examRelevance: 0-1 (TUS'ta direkt soru olma ihtimali)
- relationshipType:
    MEASURED → sayısal referans değer veya eşik
    TRAP → sık karıştırılan, tuzak bilgi
    CLINICAL_OUTCOME → fizyolojik bozulma → klinik sonuç
- derivedFrom:
    field: physiologyChain|compensationMechanism|referenceValues|hormoneTable|clinicalCorrelation|examTrap|optionAnalysis
    note: kısa açıklama

Kalite kuralları:
- spotRule sınav günü kullanılabilecek kadar kısa olmalı — mekanizma zinciri değil, net kural.
- physiologyChain maksimum 4 basamak — iyon kanalı veya enzim detayı ekleme.
- knowledgePoints içinde saf mekanizma basamağı olmasın — sonuç, eşleşme, klinik çıktı olsun.
- examFrequency ve importance gerçekçi olsun — her şeyi HIGH yapma.
- referenceValues sadece soruda geçen veya soruyu çözdüren değerleri içersin.
- hormoneTable sadece soruda geçen hormonları içersin.`;

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
- spotRule tek cümlede soruyu çözen fizyolojik kuralı versin.
- physiologyChain maksimum 4 basamak — mekanizma değil klinik zincir.
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
  "physiologyChain": "string | null",
  "compensationMechanism": "string | null",
  "referenceValues": [
    {
      "parameter": "string",
      "normalRange": "string",
      "unit": "string",
      "clinicalNote": "string"
    }
  ],
  "hormoneTable": [
    {
      "hormone": "string",
      "target": "string",
      "effect": "string"
    }
  ],
  "clinicalCorrelation": "string",
  "optionAnalysis": [
    {
      "option": "string",
      "physiologicClue": "string",
      "mechanismMeaning": "string",
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
    "promptVersion": "fizyoloji-v1-tr"
  }
}`;

  return { systemPrompt, userPrompt };
}
