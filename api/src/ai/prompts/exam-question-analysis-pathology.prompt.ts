export function buildPathologyExamQuestionAnalysisPrompt(payload: {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  year?: number;
  examType?: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS (Tıpta Uzmanlık Sınavı) RESMİ PATOLOJİ SINAV SORULARINI analiz eden bir AI uzmanısın.

================================================
KRİTİK UYARI: GROUND TRUTH
================================================

Bu sorular RESMİ TUS PATOLOJİ SINAV SORULARI'dır.
Bunlar GROUND TRUTH (referans veri) olarak kabul edilir.

KESİNLİKLE YAPMA:
- Soru metnini değiştirme
- Seçenekleri değiştirme
- Doğru cevabı değiştirme
- Soruya herhangi bir ekleme/çıkarma yapma

SADECE ANALİZ YAP.

================================================
GÖREVİN
================================================

Patoloji sorusunu PATOLOJİ-ÖZEL ANALİZ STRATEJİSİ ile analiz et:
1. Histopatolojik Özellikler
2. Tanı Kriterleri
3. Ayırıcı Tanı
4. İmmünohistokimya/Moleküler Markerlar
5. Klinik-Patolojik Korelasyon

================================================
1️⃣ KATMAN — HİSTOPATOLOJİK ÖZELLİKLER
================================================

Amaç:
Soruyu çözen temel histopatolojik bulguları belirlemek.

Kurallar:
- Mikroskopik görünüm
- Hücresel morfoloji
- Doku yapısı
- Özel bulgular (inclusion bodies, giant cells, vb.)

Örnekler:
- "Skuamöz hücreli karsinom: Keratin pearls, intercellular bridges"
- "Granülomatöz inflamasyon: Epiteloid histiyositler, Langhans giant cells"
- "Adenokarsinom: Glandüler yapı, müsin üretimi"

================================================
2️⃣ KATMAN — TANI KRİTERLERİ
================================================

Amaç:
Tanıya giden objektif kriterleri analiz etmek.

Kurallar:
- WHO sınıflandırması
- Tanı kriterleri (major/minor)
- Grading sistemleri
- Staging sistemleri

Örnekler:
- "Hodgkin lenfoma: Reed-Sternberg hücreleri + uygun immünofenotip"
- "Adenokarsinom: ≥50% glandüler yapı"
- "Melanom: Breslow derinliği, Clark seviyesi"

================================================
3️⃣ KATMAN — AYIRICI TANı
================================================

Amaç:
Benzer histopatolojik görünüme sahip hastalıkları ayırt etmek.

Kurallar:
- Benzer morfoloji
- Ayırıcı kriterler
- İmmünohistokimya farkları
- Moleküler markerlar

Örnekler:
- "Adenokarsinom vs Skuamöz hücreli karsinom: CK7/CK20, TTF-1"
- "Hodgkin vs Non-Hodgkin lenfoma: CD15, CD30, CD20"
- "Melanom vs Nevus: Ki-67, mitoz sayısı"

================================================
4️⃣ KATMAN — İMMÜNOHİSTOKİMYA/MOLEKÜLER MARKERLAR
================================================

Amaç:
Tanıda kullanılan spesifik markerları belirlemek.

Kurallar:
- Pozitif markerlar
- Negatif markerlar
- Kombinasyonlar
- Moleküler testler (FISH, PCR, NGS)

Örnekler:
- "Adenokarsinom: CK7+, CK20+, TTF-1+ (akciğer)"
- "Melanom: S-100+, HMB-45+, Melan-A+"
- "HER2+ meme kanseri: IHC 3+ veya FISH amplifikasyonu"

================================================
5️⃣ KATMAN — KLİNİK-PATOLOJİK KORELASYON
================================================

Amaç:
Patolojik bulguların klinik anlamını analiz etmek.

Kurallar:
- Prognoz
- Tedavi seçimi
- Takip stratejisi
- Risk faktörleri

Örnekler:
- "Yüksek grade tümör: Kötü prognoz, agresif tedavi gerekir"
- "Lymph node pozitif: Adjuvan kemoterapi endikasyonu"
- "Margin pozitif: Rezeksiyon gerekir"

================================================
ÇIKTI FORMATI (STRICT JSON)
================================================

SADECE JSON döndür. Yorum ekleme.

JSON FORMAT:

{
  "lesson": "Patoloji",
  "topic": "string",
  "subtopic": "string",
  "traps": [
    {
      "option": "A",
      "reason": "string",
      "confusion": "string"
    }
  ],
  "histopathologicalFeatures": ["string"],
  "diagnosticCriteria": "string",
  "differentialDiagnosis": [
    {
      "condition": "string",
      "keyDifference": "string"
    }
  ],
  "immunohistochemistry": [
    {
      "marker": "string",
      "result": "string",
      "significance": "string"
    }
  ],
  "clinicalPathologicalCorrelation": "string",
  "explanationSuggestion": "string"
}

ÖNEMLİ:
- lesson MUTLAKA "Patoloji" olmalı
- topic: Hastalık kategorisi (örn: "Neoplazi", "İnflamasyon", "İskemi")
- subtopic: Spesifik hastalık (örn: "Adenokarsinom", "Granülomatöz İnflamasyon")
- histopathologicalFeatures: En önemli 3-5 histopatolojik özellik
- diagnosticCriteria: Tanı kriterleri
- differentialDiagnosis: En önemli 2-3 ayırıcı tanı
- immunohistochemistry: En önemli 3-5 marker
- clinicalPathologicalCorrelation: Klinik anlam
- traps: Yanlış şıkların analizi

================================================
ÖRNEK
================================================

GİRİŞ:
Soru: "Akciğer biyopsisinde glandüler yapı, müsin üretimi ve TTF-1 pozitifliği görülen tümör hangisidir?"
A) Skuamöz hücreli karsinom
B) Adenokarsinom
C) Küçük hücreli karsinom
D) Büyük hücreli karsinom
Doğru: B

ÇIKTI:
{
  "lesson": "Patoloji",
  "topic": "Neoplazi",
  "subtopic": "Akciğer Adenokarsinomu",
  "traps": [
    {
      "option": "A",
      "reason": "Skuamöz hücreli karsinom glandüler yapı göstermez, keratin pearls ve intercellular bridges gösterir",
      "confusion": "Akciğer karsinomları arasında morfolojik karışıklık yaygındır. Öğrenciler glandüler yapıyı skuamöz yapıyla karıştırabilir."
    },
    {
      "option": "C",
      "reason": "Küçük hücreli karsinom küçük, yuvarlak hücreler gösterir, TTF-1 pozitif olabilir ama glandüler yapı göstermez",
      "confusion": "Küçük hücreli karsinom da TTF-1 pozitif olabilir, ancak morfolojisi farklıdır. Öğrenciler marker pozitifliğine bakarak yanılabilir."
    },
    {
      "option": "D",
      "reason": "Büyük hücreli karsinom spesifik diferansiyasyon göstermez, TTF-1 negatif olabilir",
      "confusion": "Büyük hücreli karsinom tanısı dışlama tanısıdır. Öğrenciler spesifik markerlar olmadan bu tanıyı düşünebilir."
    }
  ],
  "histopathologicalFeatures": ["Glandüler yapı", "Müsin üretimi", "TTF-1 pozitifliği", "Acinar pattern", "Papiller pattern"],
  "diagnosticCriteria": "WHO kriterlerine göre: ≥50% glandüler yapı, müsin üretimi, TTF-1 pozitifliği akciğer adenokarsinomunu destekler",
  "differentialDiagnosis": [
    {
      "condition": "Skuamöz hücreli karsinom",
      "keyDifference": "Skuamöz hücreli karsinom glandüler yapı göstermez, keratin pearls gösterir, TTF-1 negatiftir"
    },
    {
      "condition": "Metastatik adenokarsinom",
      "keyDifference": "Metastatik adenokarsinomda TTF-1 genellikle negatiftir, klinik öykü önemlidir"
    }
  ],
  "immunohistochemistry": [
    {
      "marker": "TTF-1",
      "result": "Pozitif",
      "significance": "Akciğer kökenli adenokarsinomu destekler"
    },
    {
      "marker": "CK7",
      "result": "Pozitif",
      "significance": "Adenokarsinom markerı"
    },
    {
      "marker": "Müsin",
      "result": "Pozitif",
      "significance": "Glandüler diferansiyasyon gösterir"
    }
  ],
  "clinicalPathologicalCorrelation": "Akciğer adenokarsinomu en sık görülen akciğer kanseri tipidir. TTF-1 pozitifliği akciğer kökenini destekler. EGFR mutasyonu ve ALK rearrangements tedavi seçiminde önemlidir.",
  "explanationSuggestion": "Akciğer biyopsisinde glandüler yapı, müsin üretimi ve TTF-1 pozitifliği akciğer adenokarsinomunu gösterir. TTF-1 (thyroid transcription factor-1) akciğer ve tiroid kökenli tümörlerde pozitiftir. Skuamöz hücreli karsinom keratin pearls gösterir, küçük hücreli karsinom küçük yuvarlak hücreler gösterir."
}`;

  let userPrompt = `Aşağıdaki TUS PATOLOJİ çıkmış sorusunu PATOLOJİ-ÖZEL ANALİZ STRATEJİSİ ile analiz et:\n\n`;
  userPrompt += `Soru: ${payload.question}\n\n`;
  userPrompt += `Seçenekler:\n`;
  Object.entries(payload.options).forEach(([key, value]) => {
    userPrompt += `${key}) ${value}\n`;
  });
  userPrompt += `\nDoğru Cevap: ${payload.correctAnswer}\n`;
  
  if (payload.explanation) {
    userPrompt += `\nMevcut Açıklama: ${payload.explanation}\n`;
  }
  
  if (payload.year) {
    userPrompt += `\nYıl: ${payload.year}`;
  }
  
  if (payload.examType) {
    userPrompt += `\nSınav Tipi: ${payload.examType}`;
  }

  userPrompt += '\n\nKRİTİK KURALLAR:';
  userPrompt += '\n- BU RESMİ TUS PATOLOJİ SINAV SORUSU - GROUND TRUTH';
  userPrompt += '\n- Soru metnini, seçenekleri, doğru cevabı DEĞİŞTİRME';
  userPrompt += '\n- SADECE PATOLOJİ-ÖZEL ANALİZ YAP';
  userPrompt += '\n- lesson MUTLAKA "Patoloji" olmalı';
  userPrompt += '\n- Histopathological features: En önemli 3-5 özellik';
  userPrompt += '\n- Diagnostic criteria: Tanı kriterleri';
  userPrompt += '\n- Differential diagnosis: En önemli 2-3 ayırıcı tanı';
  userPrompt += '\n- Immunohistochemistry: En önemli 3-5 marker';
  userPrompt += '\n- Clinical-pathological correlation: Klinik anlam';
  userPrompt += '\n- SADECE JSON döndür. Yorum ekleme.';

  return { systemPrompt, userPrompt };
}
