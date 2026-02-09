# TUS Medical Education Platform - Sistem Mimarisi

## 🏗️ Teknoloji Stack'i

### Backend Stack
- **Backend Framework:** NestJS (Node.js) + TypeScript
- **Database:** PostgreSQL 16
- **ORM:** Prisma (kod-odaklı şema yönetimi, tip güvenliği)
- **Queue System:** Redis + BullMQ (asenkron işlem yönetimi)
- **OCR Servisi:** PaddleOCR (FastAPI) - Docker container
- **AI Servisleri:** OpenAI GPT-4o/o1, Google Gemini Pro (Vision + Text AI)

### Frontend Stack
- **Admin Panel:** Next.js 14 (App Router, RSC)
- **Mobile App:** React Native (Expo) - iOS & Android
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI (accessible, unstyled primitives)
- **State Management:** Zustand (mobile), React Query (data fetching)

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Development:** Hot reload, nodemon, watch mode
- **Deployment:** Multi-service orchestration

## 📊 Sistemin Ana Amaçı

TUS (Tıpta Uzmanlık Sınavı) için **yapay zeka destekli içerik işleme ve adaptif öğrenme sistemi**:
- Ders notlarından/kitaplardan OCR ile içerik çıkarma
- AI ile içeriği analiz edip bilgi noktalarına (knowledge points) dönüştürme
- Flashcard ve soru üretme
- **Concept & Prerequisite Learning Graph:** Tıbbi kavramlar arası ilişki ağı ve ön koşul bilgi grafiği
- **Exam Intelligence:** Geçmiş TUS sorularından pattern analizi ve stratejik içerik önerileri
- Öğrenci performans takibi ve adaptif öğrenme

## 🔄 Ana İş Akışı (Content Pipeline)

### 1️⃣ İçerik Yükleme (Upload) Aşaması

```
Admin Panel → Upload Batch (PDF/Görseller)
                ↓
        Batch + Pages oluşturulur
                ↓
        Vision Queue'ya gönderilir
```

**Veri Modeli:** `UploadBatch` + `UploadPage`

**Durum:** `PENDING` → `UPLOADED`

### 2️⃣ OCR + Vision Processing Aşaması

```
Vision Queue işlenir
        ↓
PaddleOCR → Metin çıkarma (OCR)
        ↓
AI Vision (GPT-4o/Gemini) → İçerik analizi
        ↓
ParsedBlock'lar oluşturulur
        ↓
Batch durumu: CLASSIFIED
```

**İşlemler:**
- OCR ile metin tanıma (PaddleOCR servisi)
- AI ile içerik sınıflandırma:
  - `contentType`: TOPIC_EXPLANATION, SPOT_FACT, QUESTION_ONLY, QUESTION_WITH_ANSWER, EXPLANATION_ONLY, MIXED_CONTENT
  - `lesson`: Dahiliye, Pediatri, Nöroloji, Kardiyoloji, vb.
  - `topic`: Diyabet, Epilepsi, Anemi, Hipertansiyon, vb.
  - `subtopic`: Tanı Kriterleri, Patofizyoloji, Tedavi, vb.
- Tablo/algoritma tespiti
- Soru/cevap ayıklama
- Önemli bilgilerin (important facts) çıkarılması

**Veri Modeli:** `ParsedBlock`
- `rawText`: OCR çıktısı
- `confidence`: OCR güven skoru (0-1)
- `contentType`: İçerik tipi
- `lesson`, `topic`, `subtopic`: Sınıflandırma
- `questions`: Ayıklanan sorular (JSON)
- `importantFacts`: Önemli bilgiler (JSON)
- `tableData`: Tablo yapısı (JSON)
- `algorithmData`: Algoritma/akış diyagramı verisi (JSON)

**Durum:** `UPLOADED` → `CLASSIFIED`

### 3️⃣ Admin Review & Approval Aşaması

```
Admin Panel → Content Review
        ↓
Admin blokları inceler
        ↓
AI sınıflandırmasını doğrular/düzenler
        ↓
APPROVE veya REJECT
        ↓
ApprovedContent oluşturulur
        ↓
Batch durumu: REVIEWED
```

**Editor Özellikleri:**
- **Sol Panel:** OCR raw text (read-only)
- **Sağ Panel:** Düzenlenebilir metin
- **AI Classification:** Lesson, topic, content type gösterimi
- **Confidence Warning:** Düşük confidence uyarıları (< 0.7)
- **Edit Tracking:** `editedText` ve `isEdited` flag'i

**Approval Durumları:**
- `PENDING`: Onay bekliyor
- `APPROVED`: Onaylandı (knowledge extraction'a hazır)
- `REJECTED`: Reddedildi
- `DELETED`: Soft delete

**Veri Modeli:** `ApprovedContent`
- `blockId`: Kaynak ParsedBlock referansı
- `content`: Onaylanmış final içerik
- `blockType`: TEXT, TABLE, ALGORITHM, SPOT
- `extractionStatus`: NOT_STARTED, QUEUED, PROCESSING, COMPLETED, VERIFIED, FAILED

**Durum:** `CLASSIFIED` → `REVIEWED`

### 4️⃣ Knowledge Extraction Aşaması

```
Admin → Extract Knowledge
        ↓
Knowledge Extraction Queue
        ↓
AI → Atomik bilgi noktaları çıkarma
        ↓
KnowledgePoint'ler oluşturulur
        ↓
Batch durumu: KNOWLEDGE_EXTRACTED
```

**İşlemler:**
- Onaylanmış içerikten atomik bilgi noktaları (atomic knowledge points) çıkarma
- Her bilgi noktası için:
  - `fact`: Ana bilgi (atomic fact)
  - `category`: Ders (lesson) - örn. "Cardiology"
  - `subcategory`: Konu (topic) - örn. "Arrhythmias"
  - `priority`: Önem derecesi (0+, yüksek = daha önemli)
  - `examRelevance`: Sınav ilgisi skoru (0-1)
  - `normalizedKey`: Tekrar engellemek için hash/normalized key
  - `sourceCount`: Kaç kaynaktan türetildiği

**Deduplikasyon:**
- `normalizedKey` unique constraint ile aynı bilgi noktası tekrar oluşturulmaz
- Birden fazla kaynakta geçen bilgiler için `sourceCount` artırılır

**Veri Modeli:** `KnowledgePoint`

**Durum:** `REVIEWED` → `KNOWLEDGE_EXTRACTED`

### 5️⃣ Flashcard Generation Aşaması

```
Admin Panel → Topic seçer
        ↓
Generate Flashcards (mode: APPEND/REPLACE)
        ↓
Flashcard Generation Queue
        ↓
AI → KnowledgePoint'lerden flashcard üretir
        ↓
Flashcard'lar oluşturulur
```

**Flashcard Tipleri:**
- `SPOT`: Direkt bilgi kartı (temel bilgi)
- `CLINICAL_TIP`: Klinik ipucu/pratik bilgi
- `COMPARISON`: Kavram karşılaştırması (A vs B)
- `TRAP`: Yaygın hatalar/dikkat edilmesi gerekenler

**Anatomy-Specific Flashcard Types:** (Anatomi dersi için özel tipler)
- `FORAMEN_CONTENT`: Foramen/kanal/açıklıklardan geçen yapılar
- `SUPERLATIVE`: "En", "tek", "ilk" gibi üstünlük ifadeleri
- `LOCALIZATION_DEFICIT`: Sinir hasarı → deformite/fonksiyon kaybı ilişkisi
- `CLINICAL_LANDMARK`: Anatomik/cerrahi referans noktaları
- `EXCEPTION_DOUBLE_INNERVATION`: Çift innervasyon gibi istisnalar
- `BASIC_SPOT`: Temel anatomik ilişkiler (innervasyon, arter, fonksiyon)

**Generation Modları:**
- `APPEND`: Mevcut kartlara ekleme (yeni kartlar ekle)
- `REPLACE`: Mevcut kartları silip yeniden oluşturma

**Flashcard Yapısı:**
- `front`: Soru/prompt tarafı
- `back`: Cevap tarafı
- `cardType`: SPOT, CLINICAL_TIP, COMPARISON, TRAP...
- `lesson`: Ders (knowledge point'ten türetilir)
- `priority`: Önem derecesi
- `difficulty`: EASY, MEDIUM, HARD

**Admin Onayı:**
- `approvalStatus`: PENDING, APPROVED, REJECTED
- Onaydan sonra öğrencilere açılır

**Similarity Check:**
- `similarityChecked`: Benzer kartlar kontrol edildi mi?
- `similarCardIds`: Benzer kart ID'leri (tekrar engelleme)

**Visual Requirements:** (Görsel gereksinimleri)
- `useVisual`: Boolean - Kart görsel gerektiriyor mu?
- `visualRequirement`: IMAGE_OCCLUSION (görsel üzerinde kapatma) veya SCHEMATIC (şematik çizim)
- `visualContext`: Anatomik bölge kategorisi (SKULL_BASE, ORBIT, FOOT, AXILLA, PELVIS, BRACHIAL_PLEXUS, OTHER)
- `highlightRegion`: Vurgulanacak spesifik bölge
- `imageAssetId`: Yüklenmiş görsel asset referansı
- `visualStatus`: NOT_REQUIRED, REQUIRED (gerekli ama yüklenmemiş), UPLOADED (yüklenmiş)

**Veri Modeli:** `Flashcard`

**Durum:** `KNOWLEDGE_EXTRACTED` → `COMPLETED`

### 6️⃣ Question Generation Aşaması

```
Admin Panel → Topic seçer
        ↓
Generate Questions
        ↓
Question Generation Queue
        ↓
AI → KnowledgePoint'lerden çoktan seçmeli soru üretir
        ↓
GeneratedQuestion'lar oluşturulur
```

**Soru Özellikleri:**
- Çoktan seçmeli (4 şık: A, B, C, D)
- Doğru cevap indeksi
- Açıklama (explanation)
- Lesson/topic/subtopic etiketleme
- Trap'ler (yanıltıcı şıklar) listesi

**Soru Tipleri:**
- `SPOT`: Direkt bilgi sorusu
- `CLINICAL_CASE`: Klinik vaka sorusu
- `COMPARISON`: Karşılaştırma sorusu

**Difficulty Assessment:**
- `difficulty`: EASY, MEDIUM, HARD
- `bloomLevel`: Bloom taksonomisi seviyesi (REMEMBER, UNDERSTAND, APPLY, ANALYZE)

**Knowledge Point İlişkilendirme:**
- Her soru birden fazla knowledge point'e bağlanabilir
- `QuestionKnowledgePoint` many-to-many ilişki tablosu

**Veri Modeli:** `GeneratedQuestion`

**Durum:** `KNOWLEDGE_EXTRACTED` → `COMPLETED`

### 7️⃣ Concept & Prerequisite Learning Graph

```
Exam Question Analysis → Concepts extracted
        ↓
Concept Registry (normalized, deduplicated)
        ↓
Prerequisite nodes created
        ↓
Topic ⟷ Prerequisite edges built
        ↓
Learning path optimization
```

**Concept Management:**
- **Concept Model:** Normalized tıbbi kavramlar (anatomi, fizyoloji, patoloji)
  - `preferredLabel`: Canonical isim
  - `normalizedLabel`: Karşılaştırma için normalize edilmiş
  - `conceptType`: NERVE, MUSCLE, VESSEL, STRUCTURE, ORGAN, BONE, etc.
  - `status`: ACTIVE, NEEDS_REVIEW, MERGED
- **ConceptAlias:** Çoklu dil ve alternatif isimler
  - Turkish, English, Latin aliases
  - AI, Admin, veya Import kaynaklı
  - Usage count tracking
- **Merge Support:** Duplicate concepts birleştirilebilir

**Prerequisite Learning:**
- **Prerequisite Node:** Öğrenilmesi gereken temel bilgi birimleri
  - Bir veya birden fazla Concept içerebilir
  - `canonicalKey`: Unique identifier
- **PrerequisiteTopicEdge:** Prerequisite → Topic ilişkisi
  - `frequency`: Kaç soru bu ilişkiyi doğruladı
  - `strength`: WEAK (<= 3), MEDIUM (4-9), STRONG (>= 10)
  - Adaptive learning için kullanılır
- **Manual Merge:** Admin duplicate prerequisite'leri birleştirebilir
  - Preview impact before merge
  - Frequency aggregation
  - Strength recalculation

**UnresolvedConceptHint:**
- AI analizi sırasında match olmayan kavramlar
- Admin review için flaglenir
- Status: PENDING, RESOLVED, IGNORED

**Use Cases:**
- Öğrenciye topic öncesi "şunu bilmek gerekir" önerileri
- Zayıf konular için prerequisite gap analysis
- Curriculum design (hangi konular önce öğretilmeli)

### 8️⃣ Exam Intelligence Analyzer

```
Exam Questions (10+ yıllık geçmiş)
        ↓
Pattern Analysis (AI-free aggregation)
        ↓
Intelligence Report:
  - Pattern frequency & trends
  - Topic-pattern matrix
  - Prerequisite impact
  - Trap hotspots
  - Content gap recommendations
```

**Features:**
- **Pattern Frequency Analysis:** Hangi soru tipleri sık çıkıyor
  - Pattern count, percentage, avg year
  - Trend detection: ↑ INCREASING, ↓ DECREASING, → STABLE
- **Topic-Pattern Matrix:** Her topic için dominant patterns
  - Reliability score (yeterli veri var mı)
  - Top 5 patterns per topic
- **Prerequisite Impact:** Hangi prerequisite'ler kritik
  - Linked topics count
  - Exam importance scoring
  - Strength distribution
- **Trap Hotspots:** Yaygın hata yapılan karışan kavram çiftleri
  - Confusion pairs (concept1 ⟷ concept2)
  - Key differentiators
  - Risk level: HIGH, MEDIUM, LOW
- **Content Recommendations:** Eksik içerik için öncelikli öneriler
  - Type: FLASHCARD, QUESTION, PREREQUISITE
  - Priority: HIGH, MEDIUM, LOW
  - Metrics: exam frequency, current coverage, gap

**Performance:**
- Pure aggregation (AI call'suz)
- <5 seconds for 500+ questions
- Real-time dashboard

**Admin Dashboard:**
- 6-tab interface: Overview, Patterns, Topics, Prerequisites, Traps, Recommendations
- Interactive filtering (lesson, year range)
- Color-coded visualizations

## ⚙️ Asenkron İşlem Mimarisi (Queue System)

### BullMQ Queues

Sistemde 4 ana queue bulunur:

1. **vision** → OCR + AI Vision analizi
2. **knowledge-extraction** → Bilgi noktası çıkarma
3. **flashcard-generation** → Flashcard üretimi
4. **question-generation** → Soru üretimi

### Worker Architecture

**Worker Process:**
- Ayrı bir Node.js process olarak çalışır (`worker.ts`)
- Main API'dan bağımsız ölçeklendirilebilir
- Queue'lardaki job'ları sürekli dinler ve işler

**Processor Pattern:**
```typescript
@Processor('queue-name')
export class MyProcessor extends WorkerHost {
  async process(job: Job) {
    // İşlem mantığı
  }
}
```

**Job Flow:**
1. Controller/Service → Queue'ya job ekleme
2. Worker → Job'u yakalar
3. Processor → İş mantığını çalıştırır
4. Database → Sonuç kaydedilir
5. Status → Job completed/failed

### Queue Konfigürasyonu

**Redis Connection:**
- URL-based configuration
- Connection pooling
- Automatic reconnection

**Job Options:**
- Retry strategy (attempts, backoff)
- Priority levels
- Job removal policies
- Event listeners (completed, failed, progress)

## 🎯 Admin Panel Workflow

### Katı Sıralı Pipeline (Strict Ordering)

```
1. Upload Batches → Pages/Blocks
   ↓ (Vision processing)
2. Content Review → Approve/Reject
   ↓ (Manual review)
3. Knowledge Extraction → KnowledgePoints
   ↓ (AI extraction)
4. Generate Flashcards/Questions
   ↓ (AI generation)
5. Student Access
```

### Ana Yönetim Modülleri

**1. Content Pipeline** (`/batches`, `/content-review`, `/knowledge`)
- Batch upload & OCR processing
- Admin review & approval
- Knowledge extraction
- Flashcard/question generation

**2. Exam Intelligence** (`/exam-intelligence`)
- Geçmiş soru analizi ve intelligence report
- Pattern frequency & trends
- Topic-pattern matrix
- Content gap recommendations

**3. Exam Questions** (`/exam-questions`)
- Manual entry & bulk upload
- Lesson-specific AI analysis
- Concept & prerequisite extraction
- Similarity detection

**4. Concept Management** (`/concepts`)
- Concept registry & aliases
- Merge duplicate concepts
- Unresolved hints review

**5. Prerequisite Learning** (`/prerequisite-learning`)
- Prerequisite nodes & edges
- Topic relationship graph
- Manual merge support
- Strength visualization

**6. Topic Management** (`/topics`)
- Lesson/Topic/Subtopic registry
- Statistics & coverage
- Merge support

**7. AI Configuration** (`/ai-config`)
- Task-level AI settings
- Provider & model selection
- Temperature & token limits
- A/B testing support

**8. AI Analytics** (`/ai-analytics`)
- Token usage tracking
- Cost analysis (by task, batch, topic, time)
- ROI metrics

### Tab Kilitleme Sistemi

**Batch Detail Sayfası Tab Yapısı:**

1. **Pages / Parsed Blocks** - Her zaman aktif
2. **Approved Content** - Sadece approved content varsa aktif
3. **Knowledge** - Sadece knowledge points varsa aktif
4. **Flashcards** - Sadece flashcard'lar varsa aktif
5. **Questions** - Sadece question'lar varsa aktif
6. **Logs** - Her zaman aktif

**Disable Logic:**
- Tab'lar önceki adımlar tamamlanmadan disabled
- Lock icon (🔒) ile disabled tab'lar işaretlenir
- Tooltip ile neden disabled olduğu açıklanır
- Örnek: "Knowledge tab is locked. Please approve content first."

### Dashboard Work Queue

**Pending Work Cards:**
- Batches awaiting review (status: CLASSIFIED)
- Content awaiting approval (approvalStatus: PENDING)
- Approved content awaiting extraction (extractionStatus: NOT_STARTED)
- Topics without flashcards/questions

Her kart:
- Count badge
- "Go to" action button
- Last updated timestamp

## 🗄️ Veritabanı Şeması ve İlişkiler

### Ana Veri Modelleri

```
UploadBatch (1) ─── (N) UploadPage
    │                      │
    │                      └─ (N) ParsedBlock
    │                              │
    │                              ├─ (1) ApprovedContent
    │                              │       │
    └──────────────────────────────┘       └─ (N) KnowledgePoint
                                                     │
                                                     ├─ (N) Flashcard
                                                     ├─ (N) GeneratedQuestion (via junction)
                                                     └─ (N) ExamQuestion (via junction)
```

### Content Ingestion Pipeline Models

**UploadBatch**
```prisma
- id: UUID
- topic: String (e.g., "Cardiology - Arrhythmias")
- description: String?
- contentTypeHint: ContentType? (admin hint for all pages)
- visionProvider: AIProviderType? (OpenAI/Gemini)
- status: BatchStatus (PENDING → UPLOADED → CLASSIFIED → REVIEWED → KNOWLEDGE_EXTRACTED → COMPLETED)
- createdAt, updatedAt
- createdBy: String (admin user ID)
```

**UploadPage**
```prisma
- id: UUID
- batchId: String (foreign key)
- pageNumber: Int (order within batch)
- fileType: FileType (IMAGE, PDF)
- filePath: String (stored file path)
- originalName: String
- ocrStatus: OCRStatus (PENDING → QUEUED → PROCESSING → COMPLETED → FAILED)
- ocrJobId: String? (BullMQ job ID)
- ocrError: String?
- width, height: Int? (image dimensions)
```

**ParsedBlock**
```prisma
- id: UUID
- pageId: String (foreign key)
- contentType: ContentType (TOPIC_EXPLANATION, SPOT_FACT, etc.)
- lesson, topic, subtopic: String?
- questions: Json? (extracted questions array)
- importantFacts: Json? (important facts array)
- blockType: BlockType? (TEXT, TABLE, ALGORITHM, SPOT)
- blockIndex: Int? (order within page)
- rawText: String? (OCR output)
- confidence: Float? (OCR confidence 0-1)
- x, y, width, height: Float? (bounding box, normalized 0-1)
- tableData: Json? (structured table: {headers, rows})
- algorithmData: Json? (flowchart data)
- classificationStatus: ClassificationStatus (PENDING → CLASSIFIED → FAILED)
- classifiedAt: DateTime?
- approvalStatus: ApprovalStatus (PENDING → APPROVED → REJECTED → DELETED)
- approvedAt, approvedBy: DateTime?, String?
- editedText: String? (admin edits)
- isEdited: Boolean
- deletedAt: DateTime? (soft delete)
```

### Knowledge Extraction Models

**ApprovedContent**
```prisma
- id: UUID
- batchId, blockId: String (foreign keys)
- content: String (final approved text)
- blockType: BlockType
- extractionStatus: ExtractionStatus (NOT_STARTED → QUEUED → PROCESSING → COMPLETED → VERIFIED → FAILED)
- extractedAt: DateTime?
```

**KnowledgePoint**
```prisma
- id: UUID
- approvedContentId, blockId: String (traceability)
- normalizedKey: String @unique (deduplication hash)
- fact: String (atomic knowledge point)
- category: String? (lesson)
- subcategory: String? (topic)
- priority: Int (default 0, higher = more important)
- examRelevance: Float? (0-1 score)
- classificationConfidence: Float? (AI confidence 0-1)
- sourceCount: Int (default 1, incremented for duplicates)
```

### Flashcard & Question Models

**Flashcard**
```prisma
- id: UUID
- knowledgePointId: String (foreign key)
- cardType: CardType (SPOT, CLINICAL_TIP, COMPARISON, TRAP)
- front: String (question side)
- back: String (answer side)
- lesson: String? (derived from KnowledgePoint.category)
- priority: Int (default 0)
- difficulty: Difficulty (EASY, MEDIUM, HARD)
- approvalStatus: ApprovalStatus (PENDING → APPROVED → REJECTED)
- approvedAt, approvedBy: DateTime?, String?
- similarityChecked: Boolean
- similarCardIds: String[] (similar card IDs)
```

**GeneratedQuestion**
```prisma
- id: UUID
- question: String
- options: Json ({A, B, C, D})
- correctAnswer: String (A, B, C, or D)
- explanation: String?
- lesson, topic, subtopic: String?
- questionType: QuestionType (SPOT, CLINICAL_CASE, COMPARISON)
- difficulty: Difficulty
- bloomLevel: BloomLevel (REMEMBER, UNDERSTAND, APPLY, ANALYZE)
- traps: String[] (distractor facts)
- approvalStatus: ApprovalStatus
- similarityChecked: Boolean
```

**QuestionKnowledgePoint** (Junction Table)
```prisma
- id: UUID
- questionId, knowledgePointId: String (foreign keys)
- relationshipType: QuestionRelationType (MEASURES, APPLIES, CONTEXT)
@@unique([questionId, knowledgePointId, relationshipType])
```

### Exam Questions Models

**ExamQuestion** (Geçmiş TUS Soruları)
```prisma
- id: UUID
- year: Int
- examType: String? (TUS-1, TUS-2)
- questionNumber: Int?
- question: String
- options: Json
- correctAnswer: String
- explanation: String?
- lesson, topic, subtopic: String?
- traps: String[] (common mistakes)
- analysisStatus: AnalysisStatus (PENDING → PROCESSING → COMPLETED → FAILED)
- analyzedAt: DateTime?
- uploadedBy: String
```

**ExamQuestionKnowledgePoint** (Junction)
```prisma
- id: UUID
- examQuestionId, knowledgePointId: String
- relationshipType: RelationshipType (MEASURED, TRAP, CONTEXT)
@@unique([examQuestionId, knowledgePointId, relationshipType])
```

### Similarity & User Progress Models

**QuestionSimilarity**
```prisma
- id: UUID
- sourceQuestionId, targetQuestionId: String
- similarityScore: Float (0-1)
- comparedAt: DateTime
@@unique([sourceQuestionId, targetQuestionId])
```

**UserFlashcardProgress** (Spaced Repetition)
```prisma
- id: UUID
- userId, flashcardId: String
- easeFactor: Float (SM-2 algorithm)
- interval: Int (days until next review)
- repetitions: Int
- nextReviewDate: DateTime
- lastReviewedAt: DateTime
```

**UserWeakness** (Zayıf Konular)
```prisma
- id: UUID
- userId, knowledgePointId: String
- incorrectCount: Int (how many times answered wrong)
- lastIncorrectAt: DateTime
- reviewCount: Int (total review count)
@@unique([userId, knowledgePointId])
```

### Concept & Prerequisite Learning Models

**Concept** (Tıbbi Kavram Kayıt Defteri)
```prisma
- id: UUID
- preferredLabel: String (canonical name)
- normalizedLabel: String @unique (comparison key)
- conceptType: ConceptType (NERVE, MUSCLE, VESSEL, STRUCTURE, ORGAN, BONE, etc.)
- description: String?
- status: ConceptStatus (ACTIVE, NEEDS_REVIEW, MERGED)
- mergedIntoId: String? (merge tracking)
- subtopicId: String? (optional classification)
```

**ConceptAlias** (Çoklu Dil & Alternatif İsimler)
```prisma
- id: UUID
- conceptId: String
- alias: String (original)
- normalizedAlias: String @unique
- language: AliasLanguage (TR, EN, LA)
- source: AliasSource (AI, ADMIN, IMPORT)
- usageCount: Int (popularity tracking)
- isActive: Boolean
```

**QuestionConcept** (Junction: ExamQuestion ⟷ Concept)
```prisma
- id: UUID
- questionId: String
- conceptId: String
- confidence: Float? (AI confidence)
@@unique([questionId, conceptId])
```

**Prerequisite** (Ön Koşul Bilgi Düğümü)
```prisma
- id: UUID
- canonicalKey: String @unique
- name: String (display name)
```

**PrerequisiteConcept** (Junction: Prerequisite ⟷ Concept)
```prisma
- id: UUID
- prerequisiteId: String
- conceptId: String
@@unique([prerequisiteId, conceptId])
```

**PrerequisiteTopicEdge** (Öğrenme Grafiği Kenarı)
```prisma
- id: UUID
- prerequisiteId: String
- topicId: String
- subtopicId: String?
- frequency: Int (how many questions validated this edge)
- strength: EdgeStrength (WEAK ≤ 3, MEDIUM 4-9, STRONG ≥ 10)
- source: String (default: "QUESTION_ANALYSIS")
@@unique([prerequisiteId, topicId])
```

**UnresolvedConceptHint** (AI'dan Gelen Eşleşmeyen Kavramlar)
```prisma
- id: UUID
- hint: String (original text)
- normalizedHint: String
- questionId: String?
- lessonId, topicId, subtopicId: String?
- source: String (default: "QUESTION_ANALYSIS")
- count: Int (occurrence count)
- status: UnresolvedHintStatus (PENDING, RESOLVED, IGNORED)
@@unique([normalizedHint, topicId, subtopicId])
```

### Lesson/Topic/Subtopic Registry

**Lesson**
```prisma
- id: UUID
- name: String @unique (e.g., "Anatomi", "Dahiliye")
- displayName: String?
- description: String?
- questionCount: Int (cached)
- knowledgePointCount: Int (cached)
```

**Topic**
```prisma
- id: UUID
- name: String
- displayName: String?
- description: String?
- status: TopicStatus (ACTIVE, MERGED, ARCHIVED)
- lessonId: String?
- mergedIntoId: String? (merge tracking)
- questionCount: Int (cached)
- knowledgePointCount: Int (cached)
@@unique([name, lessonId])
```

**Subtopic**
```prisma
- id: UUID
- name: String (canonical, AI-friendly)
- displayName: String? (admin/UI)
- description: String?
- topicId: String
- lessonId: String?
- questionCount: Int (cached)
- knowledgePointCount: Int (cached)
@@unique([name, topicId])
```

### AI Token Usage Tracking

**AITokenUsage**
```prisma
- id: UUID
- provider: AIProviderType (OPENAI, GEMINI, ANTHROPIC)
- model: String (gpt-4o, gemini-pro, etc.)
- taskType: AITaskType (VISION_PARSE, KNOWLEDGE_EXTRACTION, etc.)
- inputTokens: Int
- outputTokens: Int
- totalCost: Float (calculated cost)
- completedAt: DateTime
- metadata: Json? (additional context)
```

## 🤖 AI Entegrasyonu

### AI Router Service

**Merkezi AI Yönlendirme:**
- Tek noktadan tüm AI task'leri yönetme
- Provider seçimi (OpenAI, Gemini, Anthropic)
- Fallback stratejisi (bir provider fail olursa diğeri denenebilir)
- Token tracking ve maliyet hesaplama

**AI Task Tipleri:**
```typescript
enum AITaskType {
  VISION_PARSE           // Görüntü analizi (OCR + classification)
  KNOWLEDGE_EXTRACTION   // Bilgi noktası çıkarma
  FLASHCARD_GENERATION   // Flashcard üretimi
  QUESTION_GENERATION    // Soru üretimi
  SIMILARITY_CHECK       // Benzerlik kontrolü
  CONTENT_CLASSIFICATION // İçerik sınıflandırma
}
```

### Provider Support

**OpenAI:**
- Models: GPT-4o (vision + text), GPT-4o-mini (fast text), o1-mini (reasoning), o1-preview (advanced reasoning), GPT-4-turbo
- Strong vision capabilities
- Fast response times
- Best for complex reasoning (o1 series)

**Google Gemini:**
- Models: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash
- Good multimodal performance
- Cost-effective alternative
- Fast inference (Flash models)

**Anthropic (Planned):**
- Models: Claude 3 Opus, Sonnet, Haiku
- High quality reasoning
- Context window advantages

### Prompt Engineering

**Vision Parse Prompt:** (api/src/ai/prompts/)
- Structured output requirements
- Turkish medical terminology support
- Classification schemas
- Table/algorithm detection rules

**Knowledge Extraction Prompt:**
- Atomic fact extraction rules
- Priority assignment criteria
- Exam relevance scoring
- Deduplication guidelines

**Flashcard Generation Prompt:**
- Card type selection logic
- Front/back formatting rules
- Difficulty assessment
- Clinical relevance focus

**Question Generation Prompt:**
- Stem creation guidelines
- Distractor generation (plausible wrong answers)
- Explanation requirements
- Bloom taxonomy alignment

### Token Usage & Cost Management

**Tracking:**
- Her AI çağrısı için token kullanımı kaydedilir
- `AITokenUsage` tablosunda saklanır
- Provider ve model bazında maliyet hesaplama

**Pricing Service:**
```typescript
- calculateCost(provider, model, inputTokens, outputTokens)
- Token/cost limits (opsiyonel)
- Budget alerts (planlı)
```

**Optimization:**
- Batch processing (birden fazla item tek çağrıda)
- Cache mechanisms (planlı)
- Smart provider selection (cost vs quality tradeoff)

## 🎨 Visual Asset Management

**Özellik:** Flashcard'lar için görsel asset yönetimi

**Workflow:**
1. Admin flashcard'ı inceler ve görsel gereksinimi belirler
2. Görsel yüklenir (`/uploads/visual-assets/`)
3. Asset ID flashcard'a bağlanır
4. `visualStatus`: NOT_REQUIRED → REQUIRED → UPLOADED

**Visual Requirements:**
- **IMAGE_OCCLUSION**: Görsel üzerinde kapatma (örn. foramen içerikleri)
- **SCHEMATIC**: Şematik çizim (örn. sinir pleksus)

**Visual Context Categories:**
- SKULL_BASE: Kafatası tabanı (foramen ovale, rotundum, vb.)
- ORBIT: Orbita (göz çukuru anatomisi)
- FOOT: Ayak anatomisi
- AXILLA: Koltuk altı (brakial pleksus, arterler)
- PELVIS: Pelvis anatomisi
- BRACHIAL_PLEXUS: Brakial pleksus şeması
- OTHER: Diğer anatomik bölgeler

**VisualAssetService:**
```typescript
- saveVisualAsset(file: Express.Multer.File): UploadedVisualAsset
- getVisualAssetPath(assetId: string): string | null
- deleteVisualAsset(assetId: string): void
```

**Storage:**
- Local filesystem: `./uploads/visual-assets/`
- Unique asset ID (UUID)
- File type validation (jpg, png, webp)
- Future: S3/cloud storage integration

## � AI Analytics Dashboard

**Özellik:** AI token kullanımı ve maliyet takibi

**Dashboard Views:**
1. **Summary View** (`/ai-analytics`):
   - Total requests, tokens, cost
   - Average cost per request
   - Task type breakdown

2. **By Task** (`/ai-analytics/by-task`):
   - Task type bazlı kullanım (VISION_PARSE, KNOWLEDGE_EXTRACTION, vb.)
   - Token ve maliyet dağılımı
   - Request counts

3. **By Time** (`/ai-analytics/by-time`):
   - Zaman bazlı trend analizi
   - Günlük/haftalık/aylık grafikler
   - Cost projection

4. **By Batch** (`/ai-analytics/by-batch`):
   - Batch bazlı maliyet takibi
   - Hangi batch'ler en pahalı
   - ROI analysis

5. **By Topic** (`/ai-analytics/by-topic`):
   - Topic bazlı AI kullanımı
   - Hangi konular daha çok AI gerektiriyor

**AITokenUsage Model:**
```prisma
- taskType: AITaskType
- provider: AIProviderType (OPENAI, GEMINI)
- model: String (gpt-4o, gemini-pro, vb.)
- inputTokens, outputTokens, totalTokens: Int
- costUSD: Float
- batchId, pageId, topicId, knowledgePointId: String? (izlenebilirlik)
- createdAt: DateTime
```

**Pricing Service:**
- Provider ve model bazlı token fiyatlandırması
- Dinamik cost calculation
- Cost alerts (gelecek)

## 🎛️ AI Configuration Panel

**Özellik:** AI task konfigürasyonlarını dinamik olarak yönetme

**AITaskConfig Model:**
```prisma
- taskType: AITaskType (VISION_PARSE, KNOWLEDGE_EXTRACTION, vb.)
- provider: AIProviderType (OPENAI, GEMINI)
- model: String (gpt-4o, gemini-1.5-pro, vb.)
- temperature: Float (0-2)
- maxTokens: Int
- isActive: Boolean
```

**Supported Models:**
- **OpenAI**: GPT-4o, GPT-4o-mini, o1-preview, o1-mini, GPT-4-turbo
- **Google Gemini**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash

**Admin Panel Features:**
- Real-time config editing
- Provider switching (OpenAI ↔ Gemini)
- Model selection per task type
- Temperature ve token limit ayarları
- Active/inactive toggling
- Bulk update all configs

**Use Cases:**
- A/B testing different models
- Cost optimization (switch to cheaper models)
- Quality tuning (temperature adjustment)
- Fallback configuration

## �📈 Ek Özellikler

### Exam Question Analysis

**Özellik:** Geçmiş TUS sorularını sisteme yükleme ve analiz etme

**Workflow:**
1. Admin geçmiş TUS sorularını yükler:
   - Manuel giriş (tek soru)
   - Bulk upload (toplu metin formatı)
   - PDF parsing (gelecek)
2. Lesson-specific AI analysis (ders bazlı özel analiz):
   - **Anatomy**: Foramen içerikleri, sinir hasarı, anatomik landmark'lar
   - **Pharmacology**: İlaç mekanizması, farmakokinetik, etkileşimler, yan etkiler
   - **Internal Medicine**: Klinik bulgular, tanı kriterleri, tedavi protokolü, komplikasyonlar
   - **Pathology**: Histopatolojik özellikler, immünohistokimya, klinik-patolojik korelasyon
3. Structured analysis output:
   - Lesson/topic/subtopic belirlenir
   - Spot rule (atomic fact) çıkarılır
   - Option analysis (her şık için detaylı analiz)
   - Trap'ler (yaygın hatalar) tespit edilir
   - Clinical correlation (klinik ilişkilendirme)
4. Knowledge point'lere bağlanır (QuestionKnowledgePoint junction table)
5. Similarity detection ile mevcut generated questions ile karşılaştırma
6. Trend analysis (hangi konular sık çıkıyor)

**Bulk Parser:**
- XML-like format ile toplu soru yükleme
- Format: `<soru>`, `<a>`, `<b>`, `<c>`, `<d>`, `<cevap>`, `<aciklama>`
- Batch processing ile hızlı import
- Parsing error handling ve validation

**Analysis Status:**
- PENDING → PROCESSING → ANALYZED → KNOWLEDGE_READY → CONTENT_READY → FAILED

**Fayda:**
- AI'ın soru üretimini gerçek TUS soruları ile eğitmek
- Öğrencilere geçmiş soru bazlı çalışma materyali
- Exam pattern discovery
- Lesson-specific deep analysis

### Similarity Detection

**Flashcard Similarity:**
- Yeni üretilen kartların mevcut kartlarla karşılaştırılması
- Semantic similarity (embedding-based)
- Duplicate prevention
- `similarCardIds` array'inde saklama

**Question Similarity:**
- Benzer soruları tespit etme
- QuestionSimilarity tablosunda ilişkilendirme
- Student'a çeşitli sorular sunma

**Cognitive Similarity Check:** (Gelişmiş Benzerlik Analizi)
- **Exam Reflex Similarity**: İki sorunun aynı sınav refleksini test edip etmediğini analiz eder
  - Soru tipi benzerliği (Clinical Case, Direct Fact, Comparison, vb.)
  - Bloom seviyesi karşılaştırması (REMEMBER, UNDERSTAND, APPLY, ANALYZE, vb.)
  - Tuzak mantığı (trap logic) benzerliği
  - Bilişsel yaklaşım benzerliği
- **Weighted Scoring:**
  - Primary Knowledge Similarity: 60% (ana bilgi noktası)
  - Topic Similarity: 25% (konu benzerliği)
  - Trap Similarity: 15% (tuzak stratejisi)
- **Decision Levels:**
  - IDENTICAL (>90%): Otomatik engelle
  - VERY_SIMILAR (80-90%): Admin onayı gerekli
  - SAME_KNOWLEDGE (65-80%): Uyarı ver
  - DIFFERENT (<65%): İzin ver

**Algorithm:**
- Text embedding (OpenAI embeddings API)
- Cosine similarity calculation
- AI-powered cognitive analysis (GPT-4o)
- Multi-dimensional similarity scoring

### User Progress Tracking

**Flashcard Progress (Spaced Repetition):**
- SM-2 algoritması implementasyonu
- `UserFlashcardProgress` modeli
- `easeFactor`: Başlangıç 2.5, performansa göre değişir
- `interval`: Tekrar aralığı (gün)
- `nextReviewDate`: Sonraki tekrar tarihi

**SM-2 Flow:**
1. Student kartı görür ve cevaplar
2. Response quality (0-5) kaydedilir
3. Ease factor ve interval güncellenir
4. Next review date hesaplanır

**Weakness Tracking:**
- Yanlış cevaplanan soruların knowledge point'leri kaydedilir
- `UserWeakness` modeli ile takip
- Zayıf konulara özel çalışma materyali önerisi

**Analytics:**
- Topic-level performance
- Time-based progress charts
- Strength/weakness heatmap

### Audit Logging

**AdminAuditLog Model:**
```prisma
- id: UUID
- adminUserId: String (Kim yaptı)
- actionType: String (KNOWLEDGE_EXTRACTION, FLASHCARD_GENERATION, QUESTION_GENERATION)
- actionMode: String? (APPEND, REPLACE)
- provider: AIProviderType? (OPENAI, GEMINI)
- batchId, approvedContentId, topicId, knowledgePointId: String? (Neyi etkiledi)
- success: Boolean
- resultCount: Int? (Kaç item oluşturuldu)
- skippedCount: Int? (Kaç item atlandı)
- deletedCount: Int? (REPLACE modunda kaç item silindi)
- errorMessage: String?
- metadata: Json? (Coverage report, vb.)
- createdAt: DateTime
```

**Tracked Actions:**
- Batch creation, approval, rejection
- Content edits (before/after)
- Knowledge extraction triggers
- Flashcard generation (APPEND/REPLACE mode)
- Question generation
- AI provider selection
- Bulk operations

**Coverage Tracking:**
- Topic-based coverage report
- Knowledge point distribution
- Flashcard/question generation statistics

**Use Cases:**
- Audit trail (kim, ne zaman, ne yaptı)
- Debugging (hata takibi)
- Performance monitoring (işlem süreleri)
- User activity analysis
- AI cost attribution (hangi admin ne kadar AI kullandı)

## 🔒 Güvenlik & Performans

### Security Measures

**Authentication & Authorization:**
- Admin-only access (createdBy, approvedBy fields)
- User ID tracking on all operations
- Audit logging (tüm admin aktiviteleri)
- Role-based access control (planlı)

**Data Validation:**
- Prisma schema validation
- DTO validation (class-validator)
- File type/size restrictions
- SQL injection prevention (Prisma ORM)

**Environment Security:**
- .env file for secrets
- Docker secrets (production)
- API key rotation (planlı)
- Rate limiting (planlı)

### Performance Optimization

**Database:**
- Strategic indexing:
  - Status fields (batchStatus, ocrStatus, approvalStatus)
  - Foreign keys (batchId, pageId, blockId)
  - Classification fields (lesson, topic, contentType)
  - Temporal fields (createdAt, nextReviewDate)
- Query optimization with Prisma
- Connection pooling

**File Storage:**
- Local filesystem for uploads
- Path-based organization (batch-page-uuid)
- Future: S3/cloud storage integration

**Queue Management:**
- Job prioritization
- Concurrency limits
- Retry strategies with exponential backoff
- Dead letter queue for failed jobs

**Caching (Planned):**
- Redis cache for frequent queries
- Knowledge point lookup cache
- Similarity computation cache
- API response caching

**Scalability:**
- Stateless API design
- Horizontal worker scaling (multiple worker processes)
- Database read replicas (future)
- CDN for static assets (future)

### Monitoring & Logging

**Application Logging:**
- NestJS built-in logger
- Log levels (error, warn, log, debug)
- Context-aware logging (module name)
- Structured logging (JSON format for production)

**Queue Monitoring:**
- BullMQ metrics (job count, processing time)
- Failed job tracking
- Queue health checks

**Error Handling:**
- Global exception filter
- Graceful degradation
- User-friendly error messages
- Error alerting (future)

## 🚀 Deployment & Infrastructure

### Docker Compose Services

**Services:**
1. **postgres** - PostgreSQL database
2. **redis** - Redis for queues
3. **ocr** - PaddleOCR FastAPI service
4. **api** - NestJS backend
5. **worker** - Background job processor
6. **admin** - Next.js admin panel

**Networking:**
- Internal Docker network
- Service discovery via service names
- Port mapping for external access

**Health Checks:**
- Database readiness probe
- OCR service health endpoint
- API health endpoint
- Auto-restart on failure

### Environment Configuration

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/tus

# Redis
REDIS_URL=redis://redis:6379

# OCR Service
OCR_API_URL=http://ocr:8000

# AI Services
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# File Storage
UPLOAD_DIR=./uploads

# Admin
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Development Workflow

**Local Development:**
```bash
# Start infrastructure
docker-compose up postgres redis ocr

# Run API
cd api && npm run start:dev

# Run worker
cd api && npm run start:worker

# Run admin panel
cd admin && npm run dev
```

**Production:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api worker

# Scale workers
docker-compose up -d --scale worker=3
```

## 📝 Future Enhancements

### In Progress

1. **Mobile App (React Native + Expo):**
   - ✅ Project scaffolding complete
   - ✅ Navigation structure (tabs)
   - 🔄 Flashcard study interface
   - 🔄 Spaced repetition integration
   - 🔄 Progress tracking

### Planned Features

1. **Advanced Spaced Repetition:**
   - FSRS algorithm (modern alternative to SM-2)
   - Learning analytics dashboard
   - Personalized study plans

2. **AI Improvements:**
   - Fine-tuned models on Turkish medical content
   - Multi-modal learning (text + images in flashcards)
   - Adaptive question difficulty
   - Context-aware content generation

3. **Collaboration Features:**
   - Multi-admin approval workflow
   - Comment system on content review
   - Version control for edits

4. **Student Features:**
   - Mobile app completion (iOS & Android)
   - Study streak tracking
   - Social learning (study groups)
   - Gamification (achievements, leaderboards)
   - Prerequisite-guided learning paths

5. **Content Management:**
   - Batch templates
   - Content import from other sources
   - Automated quality scoring
   - AI-powered content suggestions

6. **Advanced Analytics:**
   - Topic difficulty prediction (ML-based)
   - Student performance prediction
   - Content effectiveness metrics
   - A/B testing for different question formats
   - Real-time exam intelligence updates

7. **Infrastructure:**
   - Kubernetes deployment
   - CI/CD pipelines
   - Automated testing (unit + integration + e2e)
   - Performance monitoring (APM)
   - S3/cloud storage for uploads

### Technical Debt & Improvements

- [ ] Comprehensive test coverage (unit + integration + e2e)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Better error messages and user feedback
- [ ] Optimistic UI updates in admin panel
- [ ] Websocket for real-time updates
- [ ] File upload progress tracking
- [ ] Batch operation rollback mechanism
- [ ] Content versioning system
- [ ] Search functionality (Elasticsearch integration)
- [ ] Export features (flashcards to Anki, questions to PDF)

## 🎓 Sonuç

TUS Medical Education Platform, modern AI teknolojileri ve yazılım mühendisliği best practice'lerini birleştirerek **end-to-end bir eğitim içeriği işleme ve öğrenme platformu** sunuyor. 

**Temel Güçlü Yönler:**
- ✅ Modüler ve ölçeklenebilir mimari
- ✅ Kapsamlı AI entegrasyonu (multi-provider support)
- ✅ Katı iş akışı kontrolü (content pipeline)
- ✅ Veri bütünlüğü ve izlenebilirlik (audit logging)
- ✅ **Concept & Prerequisite Learning Graph** - Tıbbi kavram ilişkileri ve ön koşul bilgi yapısı
- ✅ **Exam Intelligence Analyzer** - Geçmiş soru pattern analizi ve stratejik öneriler
- ✅ Performans ve güvenlik odaklı tasarım
- ✅ Cross-platform support (Web + Mobile)

**Yenilikçi Özellikler:**
- AI-powered prerequisite discovery (hangi bilgi neyi gerektirir)
- Cognitive similarity detection (sorular gerçekten farklı mı)
- Exam intelligence (geçmiş sorulardan öğrenme)
- Multi-language concept support (TR, EN, LA)
- Dynamic AI configuration (real-time model switching)

Platform, tıp öğrencilerinin TUS sınavına hazırlanmasını kolaylaştırmak, **bilgi ilişkilerini görselleştirmek** ve eğitim içeriğini yapay zeka ile zenginleştirmek amacıyla tasarlanmıştır.
