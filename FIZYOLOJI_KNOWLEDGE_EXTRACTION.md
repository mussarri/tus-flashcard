# Fizyoloji Knowledge Point Extraction - AI Destekli

Bu implementasyon, TUS Fizyoloji sorularından **AI kullanarak** atomik bilgi noktaları (knowledge points) çıkarmaktadır.

## 🎯 Amaç

Fizyoloji sorularının analiz edilmiş payloadından, AI desteğiyle daha akıllı ve bağlama duyarlı knowledge pointler üretmek.

## 📁 Dosyalar

### 1. Prompt Dosyası
**Dosya:** `api/src/ai/prompts/fizyoloji-knowledge-extraction.prompt.ts`

**Fonksiyon:** `buildFizyolojiKnowledgeExtractionPrompt()`

**Özellikler:**
- Fizyoloji bilim hiyerarşisine uygun önceliklendirme
- Mekanizma akışları (en yüksek öncelik: 9)
- Homeostatic kurallar (öncelik: 8)
- Sebep-sonuç ilişkileri (öncelik: 7)
- Reseptör ve sinyal yolakları (öncelik: 7)
- Taşıma mekanizmaları (öncelik: 6)
- Klinik korelasyonlar (öncelik: 6)
- Spot kurallar (öncelik: 5)

**Girdi:**
```typescript
{
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
  analysisPayload: {
    patternType?: string;
    topic?: string;
    subtopic?: string;
    mechanismChain?: string;  // En önemli!
    spotRule?: string;
    clinicalCorrelation?: string;
    optionAnalysis?: Array<{
      option: string;
      mechanism: string;
      physiologicalOutcome: string;
      wouldBeCorrectIf: string;
      importance: "HIGH" | "LOW";
    }>;
    examTrap?: {
      confusedWith: string;
      keyDifference: string;
    };
  };
}
```

**Çıktı:**
```json
{
  "knowledgePoints": [
    {
      "fact": "Aldosteron, distal tubulde Na geri emilimini artırır",
      "normalizedKey": "aldosteron-distal-tubul-na-geri-emilim-artirir",
      "priority": 7,
      "examRelevance": 0.85,
      "examPattern": "UP_DOWN_REGULATION",
      "relationshipType": "MEASURED",
      "sourceType": "spotRule"
    }
  ]
}
```

### 2. Service Güncellemesi
**Dosya:** `api/src/knowledge-extraction/knowledge-extraction.service.ts`

**Metod:** `fizyolojiQuestionToKnowledgePointTemplate()`

**Akış:**
1. **AI Extraction (Öncelikli):**
   - Prompt oluşturulur
   - AI Router'a gönderilir
   - AI'dan gelen knowledge pointler işlenir
   - Her KP için:
     - `normalizedKey` ile upsert
     - `ExamQuestionKnowledgePoint` ilişkisi oluşturulur
     - `relationshipType` ve `sourceType` kaydedilir

2. **Fallback (AI Başarısız Olursa):**
   - Eski template-based extraction devreye girer
   - mechanismChain, spotRule, clinicalCorrelation direkt işlenir
   - Option analysis manuel olarak yapılır

## 🔄 Çalışma Akışı

```
ExamQuestion (ANALYZED) 
    ↓
generateKnowledgePointsFromExamQuestion()
    ↓
fizyolojiQuestionToKnowledgePointTemplate()
    ↓
[AI Extraction Attempt]
    ↓
buildFizyolojiKnowledgeExtractionPrompt()
    ↓
AIRouter.runTask(KNOWLEDGE_EXTRACTION)
    ↓
[Parse AI Response]
    ↓
Create/Update KnowledgePoints
    ↓
Link to ExamQuestion
    ↓
Return: { knowledgePoints: [...], aiExtracted: true }
```

## 📊 Knowledge Point Tipleri

### 1. Mekanizma Akışı (mechanismChain)
```typescript
{
  fact: "Mekanizma Akışı: Kan hacmi azalması → Venöz dönüş azalması → ...",
  priority: 9,
  examRelevance: 0.95,
  relationshipType: "CONTEXT",
  sourceType: "mechanismChain"
}
```

### 2. Spot Rule (spotRule)
```typescript
{
  fact: "Aldosteron, distal tubulde Na geri emilimini artırır",
  priority: 7,
  examRelevance: 0.85,
  relationshipType: "MEASURED",
  sourceType: "spotRule"
}
```

### 3. Klinik Korelasyon (clinicalCorrelation)
```typescript
{
  fact: "Primer hiperaldosteronizmde hipokalemi ve hipertansiyon görülür",
  priority: 6,
  examRelevance: 0.80,
  relationshipType: "MEASURED",
  sourceType: "clinicalCorrelation"
}
```

### 4. Option Insight (optionAnalysis)
```typescript
{
  fact: "ADH artışı, toplayıcı kanallarda akvaporin-2 ekspresyonunu artırır",
  priority: 5,
  examRelevance: 0.75,
  relationshipType: "OPTION_INSIGHT",
  sourceType: "option"
}
```

### 5. Exam Trap (examTrap)
```typescript
{
  fact: "ADH sadece su emilimini düzenlerken, Aldosteron Na ve K dengelemesini yapar",
  priority: 7,
  examRelevance: 0.85,
  relationshipType: "TRAP",
  sourceType: "examTrap"
}
```

## 🎯 AI Extraction Avantajları

1. **Bağlam Anlayışı:** AI, soru metnini ve seçenekleri birlikte değerlendirerek daha anlamlı KP'ler çıkarır
2. **Normalize Anahtar:** AI, anlamsal olarak benzer ifadeleri aynı normalized key'e map edebilir
3. **Önceliklendirme:** Bilgi tipine göre otomatik priority ve examRelevance ataması
4. **Esneklik:** Yeni pattern tipleri ve sourceType'lar kolayca eklenebilir
5. **Fallback Güvenliği:** AI başarısız olursa template-based extraction devreye girer

## 🔧 Kullanım

### API Endpoint
```http
POST /knowledge-extraction/admin/generate/exam-questions
Content-Type: application/json

{
  "examQuestionIds": ["uuid1", "uuid2", ...]
}
```

### Response
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "examQuestionId": "uuid1",
      "kpCount": 5,
      "spotRuleCount": 1,
      "clinicalCorrelationCount": 1,
      "examTrapCount": 1,
      "success": true
    }
  ]
}
```

## 📝 Normalization Kuralları

AI, aşağıdaki kurallara göre `normalizedKey` üretir:

1. Türkçe karakterleri normalize et
   - ı → i, ş → s, ğ → g, ü → u, ö → o, ç → c

2. Küçük harfe çevir

3. Stop words çıkar
   - ve, veya, bir, bu, için, gibi, kadar, daha, en

4. Noktalama işaretlerini çıkar

5. Birden fazla boşluğu tek boşluğa indir

6. Kelimeleri tire ile birleştir

7. Max 80 karakter

**Örnek:**
```
Input:  "Aldosteron, distal tubulde Na geri emilimini artırır"
Output: "aldosteron-distal-tubul-na-geri-emilim-artirir"
```

## ⚙️ Konfigürasyon

AI extraction için kullanılan task tipi:
```typescript
AITaskType.KNOWLEDGE_EXTRACTION
```

Bu task tip için AI Router otomatik olarak en uygun AI provider'ı seçer (OpenAI, Gemini, vb.)

## 🐛 Debug

Loglama seviyesi:
```typescript
this.logger.log(`AI extracted ${count} knowledge points`);
this.logger.debug(`Created KP: ${normalizedKey}`);
this.logger.warn('Falling back to template-based extraction');
this.logger.error('AI extraction failed: ...');
```

## 📈 Metrikler

Her KP için kaydedilen metrikler:
- `priority`: 5-9 arası (bilgi tipine göre)
- `examRelevance`: 0.75-0.95 arası
- `sourceCount`: Kaç farklı sorudan türetildiği
- `examPattern`: Soru pattern tipi (UP_DOWN_REGULATION, vb.)

## 🔮 Gelecek Geliştirmeler

- [ ] Batch processing için optimize edilmiş AI calls
- [ ] Knowledge graph oluşturma (KP'ler arası ilişkiler)
- [ ] Duplicate detection için semantic similarity
- [ ] Auto-merge similar KPs
- [ ] Quality scoring (AI confidence + human validation)
