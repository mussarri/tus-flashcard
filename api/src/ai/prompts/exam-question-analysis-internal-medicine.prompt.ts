export function buildInternalMedicineExamQuestionAnalysisPrompt(payload: {
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  year?: number;
  examType?: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS (Tıpta Uzmanlık Sınavı) RESMİ DAHİLİYE SINAV SORULARINI analiz eden bir AI uzmanısın.

================================================
KRİTİK UYARI: GROUND TRUTH
================================================

Bu sorular RESMİ TUS DAHİLİYE SINAV SORULARI'dır.
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

Dahiliye sorusunu DAHİLİYE-ÖZEL ANALİZ STRATEJİSİ ile analiz et:
1. Klinik Bulgular ve Semptomlar
2. Tanı Algoritması ve Kriterleri
3. Tedavi Protokolleri
4. Komplikasyonlar ve Prognoz
5. Ayırıcı Tanı

================================================
1️⃣ KATMAN — KLİNİK BULGULAR VE SEMPTOMLAR
================================================

Amaç:
Soruyu çözen temel klinik bulguları ve semptomları belirlemek.

Kurallar:
- Kardinal bulgular
- Patognomonik bulgular
- Semptom kombinasyonları
- Fizik muayene bulguları

Örnekler:
- "Tip 2 diyabette polidipsi, poliüri, polifaji klasik triadı"
- "KOAH'ta dispne, öksürük, wheezing"
- "Kalp yetmezliğinde S3 gallop, juguler venöz distansiyon"

================================================
2️⃣ KATMAN — TANI ALGORİTMASI VE KRİTERLERİ
================================================

Amaç:
Tanıya giden algoritmik yaklaşımı ve kriterleri analiz etmek.

Kurallar:
- Tanı kriterleri (WHO, AHA, ESC gibi)
- Laboratuvar değerleri
- Görüntüleme bulguları
- Biyopsi/histopatoloji kriterleri

Örnekler:
- "Diyabet tanısı: Açlık kan şekeri ≥126 mg/dL veya HbA1c ≥6.5%"
- "Hipertansiyon: Sistolik ≥140 mmHg veya diyastolik ≥90 mmHg"
- "KOAH: FEV1/FVC <0.70 ve reversibilite yok"

================================================
3️⃣ KATMAN — TEDAVİ PROTOKOLLERİ
================================================

Amaç:
Standart tedavi yaklaşımlarını ve protokollerini analiz etmek.

Kurallar:
- Birinci basamak tedavi
- İkinci basamak tedavi
- Kombinasyon tedavileri
- Yaş-spesifik tedavi (geriatri)

Örnekler:
- "Tip 2 diyabet: Metformin birinci basamak"
- "Hipertansiyon: ACE inhibitörü veya ARB birinci basamak"
- "KOAH: LABA + ICS kombinasyonu"

================================================
4️⃣ KATMAN — KOMPLİKASYONLAR VE PROGNOZ
================================================

Amaç:
Hastalığın komplikasyonlarını ve prognozunu analiz etmek.

Kurallar:
- Akut komplikasyonlar
- Kronik komplikasyonlar
- Mortalite/morbidite
- Yaşam kalitesi etkisi

Örnekler:
- "Diyabet: Retinopati, nefropati, nöropati"
- "KOAH: Akut eksaserbasyon, solunum yetmezliği"
- "Kalp yetmezliği: Aritmi, emboli, ölüm"

================================================
5️⃣ KATMAN — AYIRICI TANı
================================================

Amaç:
Benzer bulgulara sahip hastalıkları ayırt etmek.

Kurallar:
- Benzer semptomlu hastalıklar
- Ayırıcı kriterler
- Tanı testleri
- Klinik farklar

Örnekler:
- "Tip 1 vs Tip 2 diyabet: Otoantikor, C-peptid"
- "KOAH vs Astım: Reversibilite, yaş"
- "Sistolik vs Diyastolik kalp yetmezliği: EF değeri"

================================================
ÇIKTI FORMATI (STRICT JSON)
================================================

SADECE JSON döndür. Yorum ekleme.

JSON FORMAT:

{
  "lesson": "Dahiliye",
  "topic": "string",
  "subtopic": "string",
  "traps": [
    {
      "option": "A",
      "reason": "string",
      "confusion": "string"
    }
  ],
  "clinicalFindings": ["string"],
  "diagnosticCriteria": "string",
  "treatmentProtocol": "string",
  "complications": ["string"],
  "differentialDiagnosis": [
    {
      "condition": "string",
      "keyDifference": "string"
    }
  ],
  "explanationSuggestion": "string"
}

ÖNEMLİ:
- lesson MUTLAKA "Dahiliye" olmalı
- topic: Hastalık kategorisi (örn: "Diyabet", "Hipertansiyon", "KOAH", "Kalp Yetmezliği")
- subtopic: Spesifik alt tip (örn: "Tip 2 Diyabet", "Sistolik Kalp Yetmezliği")
- clinicalFindings: En önemli 3-5 klinik bulgu
- diagnosticCriteria: Tanı kriterleri (kısa özet)
- treatmentProtocol: Standart tedavi yaklaşımı
- complications: En sık görülen 3-5 komplikasyon
- differentialDiagnosis: En önemli 2-3 ayırıcı tanı
- traps: Yanlış şıkların analizi

================================================
ÖRNEK
================================================

GİRİŞ:
Soru: "45 yaşında bir hasta, tip 2 diyabet tanısıyla takip edilmektedir. Hangi patofizyolojik mekanizma bu hastalığın temelini oluşturur?"
A) Mutlak insülin eksikliği
B) İnsülin direnci
C) Beta hücre yıkımı
D) Otoimmün reaksiyon
Doğru: B

ÇIKTI:
{
  "lesson": "Dahiliye",
  "topic": "Diyabet",
  "subtopic": "Tip 2 Diyabet Patofizyolojisi",
  "traps": [
    {
      "option": "A",
      "reason": "Mutlak insülin eksikliği tip 1 diyabete özgüdür, tip 2'de insülin üretimi normaldir",
      "confusion": "Tip 1 ve tip 2 diyabet ayırımı sınavda sık karıştırılır. Öğrenciler 'insülin eksikliği' kavramını her iki tip için de uygulayabilir."
    },
    {
      "option": "C",
      "reason": "Beta hücre yıkımı tip 1 diyabetin patofizyolojisidir",
      "confusion": "Beta hücre hasarı hem tip 1 hem tip 2'de görülebilir, ancak tip 1'de otoimmün, tip 2'de progresif bir süreçtir. Öğrenciler bu ayrımı karıştırabilir."
    },
    {
      "option": "D",
      "reason": "Otoimmün reaksiyon tip 1 diyabetin mekanizmasıdır",
      "confusion": "Otoimmünite kavramı tip 1 diyabetle özdeşleşmiştir. Öğrenciler tip 2'de de otoimmün komponent olabileceğini düşünebilir."
    }
  ],
  "clinicalFindings": ["Polidipsi", "Poliüri", "Polifaji", "Kilo kaybı", "Yorgunluk"],
  "diagnosticCriteria": "Açlık kan şekeri ≥126 mg/dL veya HbA1c ≥6.5% veya rastgele kan şekeri ≥200 mg/dL + semptomlar",
  "treatmentProtocol": "Metformin birinci basamak. Gerekirse sulfonilüre, DPP-4 inhibitörü, GLP-1 agonist eklenir. İnsülin son basamak.",
  "complications": ["Retinopati", "Nefropati", "Nöropati", "Makrovasküler hastalık", "Diyabetik ayak"],
  "differentialDiagnosis": [
    {
      "condition": "Tip 1 Diyabet",
      "keyDifference": "Tip 1'de mutlak insülin eksikliği ve otoantikorlar var, tip 2'de insülin direnci var"
    },
    {
      "condition": "Gestasyonel Diyabet",
      "keyDifference": "Gebelikte ortaya çıkar, gebelik sonrası düzelir"
    }
  ],
  "explanationSuggestion": "Tip 2 diyabette temel patofizyolojik mekanizma insülin direncidir. Bu durumda pankreas yeterli insülin üretir ancak hedef dokular (kas, karaciğer, yağ dokusu) insüline yanıt vermez. Tip 1 diyabette ise mutlak insülin eksikliği vardır ve bu otoimmün bir süreçtir."
}`;

  let userPrompt = `Aşağıdaki TUS DAHİLİYE çıkmış sorusunu DAHİLİYE-ÖZEL ANALİZ STRATEJİSİ ile analiz et:\n\n`;
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
  userPrompt += '\n- BU RESMİ TUS DAHİLİYE SINAV SORUSU - GROUND TRUTH';
  userPrompt += '\n- Soru metnini, seçenekleri, doğru cevabı DEĞİŞTİRME';
  userPrompt += '\n- SADECE DAHİLİYE-ÖZEL ANALİZ YAP';
  userPrompt += '\n- lesson MUTLAKA "Dahiliye" olmalı';
  userPrompt += '\n- Clinical findings: En önemli 3-5 bulgu';
  userPrompt += '\n- Diagnostic criteria: Tanı kriterleri';
  userPrompt += '\n- Treatment protocol: Standart tedavi';
  userPrompt += '\n- Complications: En sık görülen 3-5 komplikasyon';
  userPrompt += '\n- Differential diagnosis: En önemli 2-3 ayırıcı tanı';
  userPrompt += '\n- SADECE JSON döndür. Yorum ekleme.';

  return { systemPrompt, userPrompt };
}
