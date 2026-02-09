export function buildCognitiveSimilarityPrompt(payload: {
  question1: string;
  options1: Record<string, string>;
  correctAnswer1: string;
  explanation1?: string;
  question2: string;
  options2: Record<string, string>;
  correctAnswer2: string;
  explanation2?: string;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sen TUS sınavına yönelik tıbbi sorular için bilişsel benzerlik değerlendirmesi yapan bir AI uzmanısın.

GÖREVİN:
İki sorunun sadece anlamsal benzerliğini değil, aynı SINAV REFLEKSİNİ test edip etmediğini değerlendirmek.

================================================
ÖNEMLİ KAVRAMLAR
================================================

1. SINAV REFLEKSİ (Exam Reflex):
   - Öğrencinin soruyu çözmek için kullandığı bilişsel yaklaşım
   - Sorunun test ettiği düşünme süreci
   - Aynı refleks = Aynı zihinsel adımlar, aynı bilgi kombinasyonu, aynı mantık zinciri

2. SORU TİPİ (Question Type):
   - Klinik vaka (Clinical Case): Hasta sunumu, tanı/tedavi kararı
   - Doğrudan bilgi (Direct Fact): Ezber gerektiren, direkt bilgi sorusu
   - Karşılaştırma (Comparison): İki kavram/ilaç/hastalık karşılaştırması
   - Patofizyoloji (Pathophysiology): Mekanizma, neden-sonuç ilişkisi
   - Tanı algoritması (Diagnostic Algorithm): Adım adım tanı süreci
   - Tedavi algoritması (Treatment Algorithm): Tedavi seçimi/dozu

3. TUZAK MANTIĞI (Trap Logic):
   - Sorunun öğrenciyi yanıltmak için kullandığı distractor stratejisi
   - Benzer görünen ama farklı kavramlar
   - Yaygın karışıklıklar
   - Yanlış ilişkilendirmeler

4. BLOOM SEVİYESİ (Bloom's Taxonomy):
   - REMEMBER: Ezber, direkt bilgi hatırlama
   - UNDERSTAND: Anlama, kavram açıklama
   - APPLY: Uygulama, bilgiyi yeni duruma uygulama
   - ANALYZE: Analiz, parçalara ayırma, ilişki kurma
   - EVALUATE: Değerlendirme, karşılaştırma, eleştirel düşünme
   - CREATE: Sentez, yeni çözüm üretme

================================================
DEĞERLENDİRME KRİTERLERİ
================================================

İki soru AYNI SINAV REFLEKSİNİ test ediyorsa:
✓ Aynı soru tipinde olmalı
✓ Aynı Bloom seviyesinde olmalı
✓ Benzer tuzak mantığı kullanmalı
✓ Öğrencinin aynı zihinsel süreçleri kullanması gerekir
✓ Aynı bilgi kombinasyonunu gerektirmeli

İki soru FARKLI REFLEKS test ediyorsa:
✗ Farklı soru tipleri (örn: klinik vaka vs. doğrudan bilgi)
✗ Farklı Bloom seviyeleri (örn: REMEMBER vs. ANALYZE)
✗ Farklı tuzak stratejileri
✗ Farklı düşünme süreçleri gerektiriyor

ÖRNEKLER:

ÖRNEK 1: AYNI REFLEKS
Soru 1: "45 yaşında diyabetik hasta, hiperglisemi ile başvuruyor. En olası patofizyolojik mekanizma?"
Soru 2: "Tip 2 diyabetli hastada insülin direnci nasıl gelişir?"
→ Her ikisi de patofizyoloji test ediyor, aynı refleks (mekanizma anlama)

ÖRNEK 2: FARKLI REFLEKS
Soru 1: "Diyabet tanı kriterleri nelerdir?" (REMEMBER, doğrudan bilgi)
Soru 2: "Açlık kan şekeri 140 mg/dL olan hasta için en uygun yaklaşım?" (APPLY, klinik vaka)
→ Farklı refleksler: Biri ezber, diğeri uygulama

ÖRNEK 3: SEMANTİK BENZER AMA FARKLI REFLEKS
Soru 1: "Diyabet tedavisinde metformin dozu?" (REMEMBER, ezber)
Soru 2: "Metformin kullanan diyabetik hastada laktik asidoz riski değerlendirmesi?" (ANALYZE, risk analizi)
→ Aynı konu, farklı refleks

================================================
ÇIKTI FORMATI
================================================

SADECE JSON döndür. Başka metin ekleme.

JSON FORMAT:

{
  "cognitiveSimilarity": {
    "sameExamReflex": boolean,  // Aynı sınav refleksini test ediyor mu?
    "overallScore": number,     // 0-1 arası genel bilişsel benzerlik skoru
    "confidence": number        // 0-1 arası güven skoru
  },
  "analysis": {
    "questionType1": string,     // İlk sorunun tipi
    "questionType2": string,     // İkinci sorunun tipi
    "questionTypeMatch": boolean, // Soru tipleri eşleşiyor mu?
    
    "bloomLevel1": "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE",
    "bloomLevel2": "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE",
    "bloomLevelMatch": boolean,  // Bloom seviyeleri eşleşiyor mu?
    
    "trapLogic1": string,        // İlk sorunun tuzak mantığı açıklaması
    "trapLogic2": string,        // İkinci sorunun tuzak mantığı açıklaması
    "trapLogicSimilarity": number, // 0-1 arası tuzak mantığı benzerliği
    
    "cognitiveProcess1": string, // İlk sorunun gerektirdiği bilişsel süreç
    "cognitiveProcess2": string, // İkinci sorunun gerektirdiği bilişsel süreç
    "cognitiveProcessMatch": boolean, // Bilişsel süreçler eşleşiyor mu?
    
    "examReflexDescription": string // Her iki sorunun test ettiği refleks açıklaması (eğer aynıysa)
  },
  "reasoning": {
    "whySameOrDifferent": string, // Neden aynı/farklı refleks test ediyor?
    "keyDifferences": string[],    // Önemli farklılıklar (eğer farklıysa)
    "keySimilarities": string[]    // Önemli benzerlikler
  }
}`;

  const userPrompt = `Aşağıdaki iki TUS sorusunu bilişsel benzerlik açısından değerlendir.

SORU 1:
Soru Metni: ${payload.question1}
Seçenekler: ${JSON.stringify(payload.options1, null, 2)}
Doğru Cevap: ${payload.correctAnswer1}
${payload.explanation1 ? `Açıklama: ${payload.explanation1}` : ''}

SORU 2:
Soru Metni: ${payload.question2}
Seçenekler: ${JSON.stringify(payload.options2, null, 2)}
Doğru Cevap: ${payload.correctAnswer2}
${payload.explanation2 ? `Açıklama: ${payload.explanation2}` : ''}

KRİTİK: 
- Sadece anlamsal benzerliğe bakma
- Aynı SINAV REFLEKSİNİ test edip etmediklerini değerlendir
- Soru tipi, Bloom seviyesi, tuzak mantığı ve bilişsel süreçleri karşılaştır
- Öğrencinin nasıl düşünmesi gerektiğini analiz et

SADECE JSON döndür. Tüm açıklamalar TÜRKÇE olmalıdır.`;

  return { systemPrompt, userPrompt };
}
