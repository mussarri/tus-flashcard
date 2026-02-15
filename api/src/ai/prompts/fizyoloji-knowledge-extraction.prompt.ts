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
  const systemPrompt = `SEN TUS FİZYOLOJİ SINAVI İÇİN BİLGİ NOKTASI ÇIKARMA UZMANISIN.

GÖREV:
Analiz edilmiş fizyoloji sorularından ATOMIK bilgi noktaları (knowledge points) çıkar.

==========================================================
FİZYOLOJİ'DE BİLGİ NOKTASI ÖNCELİKLERİ
==========================================================

FİZYOLOJİ biliminde bilgi katmanları şu hiyerarşiye sahiptir:

1. MEKANİZMA AKIŞLARI (En Yüksek Öncelik)
   - Fizyolojik olayların sebep-sonuç zinciri
   - Örnek: "Kan hacmi azalması → Venöz dönüş azalması → Kalp debisi azalması → Baroreseptör aktivitesi azalması → Sempatik aktivite artışı → Taşikardi"
   - Priority: 9
   - examRelevance: 0.95

2. HOMEOSTATIC KURALLAR
   - Vücudun homeostazı koruma mekanizmaları
   - Feedback döngüleri (negatif/pozitif)
   - Kompansasyon yanıtları
   - Örnek: "Metabolik asidoz durumunda solunum kompansasyonu ile hiperventilasyon görülür"
   - Priority: 8
   - examRelevance: 0.90

3. NEDEN-SONUÇ İLİŞKİLERİ
   - Bir parametrenin değişiminin diğerlerine etkisi
   - Örnek: "Aldosteron artışı, Na geri emilimini artırırken K ve H sekresyonunu artırır"
   - Priority: 7
   - examRelevance: 0.85

4. RESEPTÖr VE SİNYAL YOLAKLARI
   - G-protein yolakları
   - İkincil haberci sistemleri
   - Reseptör tip ve etkileri
   - Priority: 7
   - examRelevance: 0.85

5. TAŞIMA MEKANİZMALARI
   - Aktif/Pasif transport
   - Difüzyon tipleri
   - Carrier sistemler
   - Priority: 6
   - examRelevance: 0.80

6. KLİNİK KORELASYONLAR
   - Lab bulguları ile fizyolojik değişimler
   - Klinik tablolar
   - Örnek: "Primer hiperaldosteronizmde hipokalemi ve hipertansiyon görülür"
   - Priority: 6
   - examRelevance: 0.80

7. SPOT KURALLARI
   - Atom düzeyinde fizyolojik gerçekler
   - Tek cümlelik kurallar
   - Priority: 5
   - examRelevance: 0.75

==========================================================
ÇIKARMA STRATEJİSİ
==========================================================

Analiz edilen sorudan şu sırayla bilgi noktaları çıkar:

1. MECHANISM CHAIN (mechanismChain)
   - Eğer varsa, bu EN ÖNEMLİ bilgi noktasıdır
   - Başına "Mekanizma Akışı:" ekle
   - relationshipType: "CONTEXT"
   - priority: 9

2. SPOT RULE (spotRule)
   - Atom düzeyinde tek cümlelik gerçek
   - relationshipType: "MEASURED"
   - priority: 7

3. CLINICAL CORRELATION (clinicalCorrelation)
   - Lab bulgular veya klinik tablolar
   - relationshipType: "MEASURED"
   - priority: 6

4. OPTION ANALYSIS (optionAnalysis)
   - Her seçenek için:
     a) physiologicalOutcome → Eğer importance: HIGH ise KP oluştur
     b) wouldBeCorrectIf → Eğer önemli bilgi içeriyorsa KP oluştur
   - relationshipType: "OPTION_INSIGHT"
   - priority: 5

5. EXAM TRAP (examTrap)
   - Karıştırılabilecek kavramlar arası farklar
   - Örnek: "ADH sadece su emilimini düzenlerken, Aldosteron Na ve K dengelemesini yapar"
   - relationshipType: "TRAP"
   - priority: 7

==========================================================
BİLGİ NOKTASI FORMATI
==========================================================

Her bilgi noktası için:

{
  "fact": string,              // Tek cümlelik atomik bilgi
  "source": "EXAM_ANALYSIS",   // Sabit
  "priority": number,          // 5-9 arası
  "examRelevance": number,     // 0.75-0.95 arası
  "examPattern": string,       // analysisPayload'dan patternType
  "relationshipType": string,  // CONTEXT, MEASURED, OPTION_INSIGHT, TRAP
  "sourceType": string         // mechanismChain, spotRule, clinicalCorrelation, option, examTrap
}

==========================================================
ATOMIK OLMA KRİTERLERİ
==========================================================

✅ İYİ:
- "Aldosteron, distal tubulde Na geri emilimini artırır"
- "Metabolik asidozda kompansasyon için hiperventilasyon gelişir"
- "Baroreseptör aktivitesi azaldığında sempatik aktivite artar"

❌ KÖTÜ:
- "Aldosteron önemlidir" (çok genel)
- "Bu soruda böbrek fonksiyonu sorgulanıyor" (açıklama)
- "Seçeneklere bakıldığında..." (meta ifade)

==========================================================
NORMALIZATION KURALLARI
==========================================================

Her bilgi için normalizedKey üret:
1. Türkçe karakterleri normalize et (ı→i, ş→s, ö→o, ü→u, ç→c, ğ→g)
2. Küçük harfe çevir
3. Stop words çıkar (ve, veya, bir, bu, için, gibi, kadar, daha, en)
4. Noktalama işaretlerini çıkar
5. Birden fazla boşluğu tek boşluğa indir
6. Kelimeleri tire ile birleştir
7. Max 80 karakter

Örnek:
"Aldosteron, distal tubulde Na geri emilimini artırır"
→ "aldosteron-distal-tubul-na-geri-emilim-artirir"

==========================================================
ÖZEL DURUMLAR
==========================================================

1. MechanismChain yoksa:
   - spotRule'dan ana bilgiyi kullan
   - Varsa seçenek analizinden mekanizma akışı oluştur

2. Option Analysis:
   - Sadece importance: HIGH olan seçenekleri işle
   - physiologicalOutcome boş değilse bilgi noktası oluştur
   - En fazla 2-3 seçenekten bilgi çıkar

3. Duplicate kontrolü:
   - Aynı normalized key'e sahip farklı ifadeleri birleştirme
   - Her bilgi benzersiz olmalı

==========================================================
ÇIKTI FORMATI (STRICT JSON)
==========================================================

{
  "knowledgePoints": [
    {
      "fact": "string",
      "normalizedKey": "string",
      "priority": number,
      "examRelevance": number,
      "examPattern": "string",
      "relationshipType": "CONTEXT" | "MEASURED" | "OPTION_INSIGHT" | "TRAP",
      "sourceType": "mechanismChain" | "spotRule" | "clinicalCorrelation" | "option" | "examTrap"
    }
  ]
}

HER zaman en az 1, en fazla 8 bilgi noktası çıkar.
Boş dizi DÖNME.`;

  const analysis = payload.analysisPayload;

  let userPrompt = `FİZYOLOJİ sınav sorusundan bilgi noktaları çıkar:\n\n`;

  // Soru bilgileri
  userPrompt += `SORU: ${payload.question}\n\n`;
  userPrompt += `SEÇENEKLER:\n`;
  Object.entries(payload.options).forEach(([key, value]) => {
    userPrompt += `${key}) ${value}\n`;
  });
  userPrompt += `\nDOĞRU CEVAP: ${payload.correctAnswer}\n\n`;

  // Analysis payload bilgileri
  userPrompt += `ANALİZ BİLGİLERİ:\n`;
  userPrompt += `----------------------------------------\n`;

  if (analysis.patternType) {
    userPrompt += `Pattern Type: ${analysis.patternType}\n`;
  }

  if (analysis.topic) {
    userPrompt += `Topic: ${analysis.topic}\n`;
  }

  if (analysis.subtopic) {
    userPrompt += `Subtopic: ${analysis.subtopic}\n\n`;
  }

  // Mechanism Chain (En önemli)
  if (analysis.mechanismChain) {
    userPrompt += `MECHANISM CHAIN (Priority 9):\n`;
    userPrompt += `"${analysis.mechanismChain}"\n\n`;
  }

  // Spot Rule
  if (analysis.spotRule) {
    userPrompt += `SPOT RULE (Priority 7):\n`;
    userPrompt += `"${analysis.spotRule}"\n\n`;
  }

  // Clinical Correlation
  if (analysis.clinicalCorrelation) {
    userPrompt += `CLINICAL CORRELATION (Priority 6):\n`;
    userPrompt += `"${analysis.clinicalCorrelation}"\n\n`;
  }

  // Option Analysis
  if (analysis.optionAnalysis && Array.isArray(analysis.optionAnalysis)) {
    userPrompt += `OPTION ANALYSIS:\n`;
    analysis.optionAnalysis.forEach((opt: any) => {
      userPrompt += `\n${opt.option}:\n`;
      userPrompt += `  - Mechanism: ${opt.mechanism}\n`;
      userPrompt += `  - Physiological Outcome: ${opt.physiologicalOutcome}\n`;
      userPrompt += `  - Would Be Correct If: ${opt.wouldBeCorrectIf}\n`;
      userPrompt += `  - Importance: ${opt.importance}\n`;
    });
    userPrompt += `\n`;
  }

  // Exam Trap
  if (analysis.examTrap) {
    userPrompt += `EXAM TRAP (Priority 7):\n`;
    userPrompt += `  - Confused With: ${analysis.examTrap.confusedWith}\n`;
    userPrompt += `  - Key Difference: ${analysis.examTrap.keyDifference}\n\n`;
  }

  userPrompt += `----------------------------------------\n\n`;

  // Talimatlar
  userPrompt += `TALİMATLAR:\n`;
  userPrompt += `1. Yukarıdaki analiz verilerinden atomik bilgi noktaları çıkar\n`;
  userPrompt += `2. Her bilgi noktası için normalizedKey oluştur\n`;
  userPrompt += `3. Priority ve examRelevance değerlerini bilgi tipine göre ayarla\n`;
  userPrompt += `4. relationshipType ve sourceType'ı doğru belirle\n`;
  userPrompt += `5. Minimum 1, maksimum 8 bilgi noktası döndür\n`;
  userPrompt += `6. SADECE geçerli JSON döndür. Yorum ekleme.\n`;

  return { systemPrompt, userPrompt };
}
