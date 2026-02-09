# 📚 Lesson, Topic & Subtopic Registry System

## 🎯 Genel Bakış

Exam question analizi sonrası lesson, topic ve subtopic'leri otomatik olarak sisteme kaydeden registry sistemi. Yeni bir lesson/topic/subtopic tespit edildiğinde otomatik olarak oluşturulur ve soru sayıları güncellenir.

---

## 🗂️ Database Schema

### Lesson Model
```prisma
model Lesson {
  id          String   @id @default(uuid())
  name        String   @unique          // "Anatomi", "Dahiliye", "Pediatri"
  displayName String?                   // Görüntülenecek isim
  description String?                   // Açıklama
  
  // Statistics
  questionCount       Int @default(0)   // Bu lesson'da kaç soru var
  knowledgePointCount Int @default(0)   // Kaç knowledge point var (gelecekte)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Topic Model
```prisma
model Topic {
  id          String   @id @default(uuid())
  name        String                    // "Orbit", "Skull base"
  displayName String?
  lesson      String                    // Parent lesson
  description String?
  
  // Statistics
  questionCount       Int @default(0)
  knowledgePointCount Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([name, lesson])              // Her lesson için unique
}
```

### Subtopic Model
```prisma
model Subtopic {
  id          String   @id @default(uuid())
  name        String                    // "Osseous boundaries", "Foramina"
  displayName String?
  topicName   String                    // Parent topic
  lesson      String                    // Grand-parent lesson
  description String?
  
  // Statistics
  questionCount       Int @default(0)
  knowledgePointCount Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([name, topicName, lesson])   // Her topic için unique
}
```

---

## 🔄 Otomatik Kayıt Akışı

### 1. Question Analysis Tamamlandığında

```typescript
// ExamQuestionProcessor
async process(job: Job) {
  // 1. Question'ı analiz et
  const result = await examQuestionService.analyzeExamQuestion(id);
  
  // 2. Registry'ye kaydet (YENİ!)
  await registryService.registerAnalysisResults(
    result.lesson,    // "Anatomi"
    result.topic,     // "Orbit"
    result.subtopic   // "Osseous boundaries"
  );
  
  // 3. Prerequisite graph'ı güncelle
  if (result.lesson === 'Anatomi') {
    await prerequisiteLearningService.processAnalyzedQuestion(id);
  }
}
```

### 2. Registry Service İşlemleri

```typescript
// ExamQuestionRegistryService
async registerAnalysisResults(lesson, topic, subtopic) {
  // 1. Lesson'ı kaydet/güncelle
  if (lesson) {
    await ensureLesson(lesson);
  }
  
  // 2. Topic'i kaydet/güncelle
  if (topic && lesson) {
    await ensureTopic(topic, lesson);
  }
  
  // 3. Subtopic'i kaydet/güncelle
  if (subtopic && topic && lesson) {
    await ensureSubtopic(subtopic, topic, lesson);
  }
  
  // 4. Question sayılarını güncelle
  await updateQuestionCounts(lesson, topic, subtopic);
}
```

### 3. Upsert Logic

```typescript
// Eğer yoksa oluştur, varsa sadece updatedAt güncelle
await prisma.lesson.upsert({
  where: { name: "Anatomi" },
  create: {
    name: "Anatomi",
    displayName: "Anatomi",
    questionCount: 0,
  },
  update: {
    updatedAt: new Date(),  // Sadece timestamp güncelle
  },
});
```

---

## 📊 Statistics Güncelleme

### Question Count Update

Her kayıt işleminden sonra otomatik olarak soru sayıları güncellenir:

```typescript
// Lesson için
const count = await prisma.examQuestion.count({
  where: {
    lesson: "Anatomi",
    analysisStatus: "ANALYZED",
  },
});

await prisma.lesson.update({
  where: { name: "Anatomi" },
  data: { questionCount: count },
});
```

**Not**: Sadece `ANALYZED` durumundaki sorular sayılır.

---

## 🔌 API Endpoints

### 1. Registry İstatistikleri
```http
GET /admin/registry/stats

Response:
{
  "success": true,
  "stats": {
    "totalLessons": 12,
    "totalTopics": 156,
    "totalSubtopics": 423,
    "totalAnalyzedQuestions": 1250
  }
}
```

### 2. Tüm Lesson'ları Listele
```http
GET /admin/registry/lessons

Response:
{
  "success": true,
  "lessons": [
    {
      "id": "uuid",
      "name": "Anatomi",
      "displayName": "Anatomi",
      "questionCount": 450,
      "knowledgePointCount": 0,
      "createdAt": "2024-01-15T10:00:00Z"
    },
    ...
  ]
}
```

**Not**: Lessons questionCount'a göre azalan sırada (en çok sorulu en üstte).

### 3. Bir Lesson'ın Topic'lerini Listele
```http
GET /admin/registry/lessons/Anatomi/topics

Response:
{
  "success": true,
  "topics": [
    {
      "id": "uuid",
      "name": "Orbit",
      "lesson": "Anatomi",
      "questionCount": 24,
      "knowledgePointCount": 0
    },
    ...
  ]
}
```

### 4. Bir Topic'in Subtopic'lerini Listele
```http
GET /admin/registry/lessons/Anatomi/topics/Orbit/subtopics

Response:
{
  "success": true,
  "subtopics": [
    {
      "id": "uuid",
      "name": "Osseous boundaries",
      "topicName": "Orbit",
      "lesson": "Anatomi",
      "questionCount": 8
    },
    ...
  ]
}
```

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Yeni Question Analizi

```
1. Admin bulk upload yapar (50 soru)
2. Status = RAW olarak kaydedilir
3. Admin "Bulk Analyze" tıklar
4. Her soru için:
   a. AI analiz yapar → lesson: "Anatomi", topic: "Orbit"
   b. Registry Service çalışır:
      - Lesson "Anatomi" yoksa oluşturur
      - Topic "Orbit" (Anatomi) yoksa oluşturur
      - Soru sayılarını günceller
5. Sonuç:
   - Lesson.questionCount: 50 artar
   - Topic.questionCount: 50 artar (eğer hepsi aynı topic'te)
```

### Senaryo 2: Mevcut Lesson'a Yeni Topic Ekleme

```
1. "Anatomi" lesson zaten var
2. Yeni soru analizi → topic: "Pterygopalatine fossa" (yeni!)
3. Registry Service:
   - "Anatomi" lesson'ı bulur (güncelleme gerekmez)
   - "Pterygopalatine fossa" topic'ini oluşturur
   - İlişkilendirme: topic.lesson = "Anatomi"
4. Sonuç:
   - Yeni topic otomatik eklendi
   - Toplam topic sayısı arttı
```

### Senaryo 3: Registry Browsing (Gelecekte)

```
1. Admin "Registry Browser" sayfasına gider
2. Tüm lesson'ları görür (soru sayısıyla birlikte)
3. "Anatomi" (450 soru) → tıklar
4. Anatomi'nin topic'lerini görür:
   - Orbit (24 soru)
   - Skull base (18 soru)
   - Pterygopalatine fossa (12 soru)
   - ...
5. "Orbit" → tıklar
6. Orbit'in subtopic'lerini görür:
   - Osseous boundaries (8 soru)
   - Foramina (7 soru)
   - ...
```

---

## ⚙️ Migration

Migration dosyası oluşturuldu:
```
/api/prisma/migrations/20260120000000_add_lesson_topic_registry/migration.sql
```

Çalıştırmak için:
```bash
cd api
npm run prisma:migrate:deploy
# veya
npx prisma migrate deploy
```

**Önemli**: Mevcut sorulardaki lesson/topic/subtopic'ler için bir kerelik migration gerekebilir.

---

## 🔧 Konfigürasyon

### ExamQuestionModule
```typescript
providers: [
  ExamQuestionService,
  ExamQuestionProcessor,
  ExamQuestionRegistryService,  // YENİ!
  // ...
]
```

### ExamQuestionProcessor
```typescript
constructor(
  private readonly registryService: ExamQuestionRegistryService,
  // ...
)
```

---

## 📈 İstatistikler ve Raporlama

### Registry Stats Dashboard (Gelecekte)

```typescript
// Örnek kullanım
const stats = await registryService.getRegistryStats();

// Output:
{
  totalLessons: 12,           // 12 farklı lesson
  totalTopics: 156,           // 156 farklı topic
  totalSubtopics: 423,        // 423 farklı subtopic
  totalAnalyzedQuestions: 1250  // Toplam analiz edilmiş soru
}
```

### Top Lessons by Question Count

```typescript
const lessons = await registryService.getAllLessons();

// Output (sıralı):
[
  { name: "Anatomi", questionCount: 450 },
  { name: "Dahiliye", questionCount: 380 },
  { name: "Pediatri", questionCount: 220 },
  ...
]
```

---

## 🚀 Avantajlar

### 1. **Otomatik Yönetim**
- Yeni lesson/topic manuel ekleme gerekmez
- Analiz sırasında otomatik oluşturulur
- Yönetici müdahalesi minimum

### 2. **Tutarlılık**
- Unique constraint ile tekrar önlenir
- Her topic sadece bir lesson'a bağlı
- Her subtopic sadece bir topic'e bağlı

### 3. **İstatistikler**
- Gerçek zamanlı soru sayıları
- En popüler lesson/topic'leri görme
- Content gap analizi için veri

### 4. **Genişletilebilir**
- Knowledge point sayıları eklenebilir
- Flashcard sayıları eklenebilir
- Diğer metrikler eklenebilir

---

## 🔮 Gelecek Geliştirmeler

### 1. Registry Browser UI
- Admin panelinde görsel browser
- Hiyerarşik ağaç yapısı
- Drill-down navigasyon

### 2. Manual Management
- Lesson/Topic birleştirme
- İsim düzenleme (rename)
- Description ekleme
- DisplayName özelleştirme

### 3. Analytics
- Trend analizi (zamanla topic popülerliği)
- Coverage analizi (hangi topic'lerde eksiklik var)
- Recommendation engine (hangi topic'lere odaklanmalı)

### 4. Knowledge Point Integration
- KnowledgePoint sayılarını da takip et
- Lesson/Topic başına KP hedefleri
- Coverage skorları

---

## 📝 Önemli Notlar

### 1. Unique Constraints
```typescript
// Lesson: name unique
"Anatomi" → Sadece 1 tane olabilir

// Topic: (name, lesson) unique
"Orbit" + "Anatomi" → OK
"Orbit" + "Dahiliye" → OK (farklı lesson)

// Subtopic: (name, topicName, lesson) unique
"Foramina" + "Orbit" + "Anatomi" → OK
"Foramina" + "Skull base" + "Anatomi" → OK (farklı topic)
```

### 2. Cascade Updates
- Question analizi değişirse (re-analyze) counts otomatik güncellenir
- Question silinirse count'lar düşer (manuel update gerekebilir)

### 3. Performance
- Indexes: name, lesson, questionCount
- Upsert kullanımı ile performans optimizasyonu
- Batch updates desteklenir

---

## ✅ Özet

**Ne Yapıldı**:
1. ✅ Lesson, Topic, Subtopic model'leri eklendi
2. ✅ ExamQuestionRegistryService oluşturuldu
3. ✅ ExamQuestionProcessor'a entegre edildi
4. ✅ Otomatik kayıt ve güncelleme logic'i
5. ✅ Admin API endpoints eklendi
6. ✅ Migration hazırlandı

**Sonuç**:
- Analiz edilen her soru otomatik olarak lesson/topic/subtopic registry'sine kaydedilir
- Yeni kavramlar tespit edildiğinde otomatik oluşturulur
- Soru sayıları gerçek zamanlı güncellenir
- API üzerinden registry'ye erişim sağlanır

**Kullanıma Hazır! 🎉**
