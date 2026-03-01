# Architecture & Flow Report: TUS Platform — Knowledge & Exam Pipelines

---

## 1) High-Level Modules

| Module / Directory | Role |
|---|---|
| `api/src/knowledge-extraction/` | Extracts KPs from `ApprovedContent` and `ExamQuestion`; upserts to DB; queues downstream jobs |
| `api/src/exam-question/` | Stores, analyzes, and manages exam questions; triggers analysis via AI |
| `api/src/flashcard/` | Generates flashcards from KPs; manages flashcard state |
| `api/src/ai/` | AI router (`AIRouterService`), task-type dispatch, prompt selection, model abstraction |
| `api/src/queue/` | BullMQ queue declarations, job names, queue constants (`QueueName`) |
| `api/src/processors/` (assumed) | BullMQ processor handlers that consume queued jobs |
| `api/src/prisma/` | PrismaService — single DB client wrapper |
| `api/src/admin/` | Admin endpoints that manually trigger generation flows |

---

## 2) Data Models (Prisma)

### ExamQuestion
*Searched: `analysisPayload`, `analysisStatus`, `spotRule`*

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `question` | Raw question text |
| `options` | JSON — answer options |
| `correctAnswer` | String |
| `explanation` | String |
| `analysisStatus` | Enum — `PENDING`, `ANALYZED`, (and likely `FAILED`) |
| `analysisPayload` | JSON — full AI analysis output (contains `spotRule`, `clinicalCorrelation`, `examTrap`, `optionAnalysis`, `patternType`, `mechanismChain`) |
| `lessonId` | FK → Lesson |
| `topicId` | FK → Topic |
| `subtopicId` | FK → Subtopic |
| `lesson` | Relation → Lesson (used for lesson-name dispatch: `"Anatomi"`, `"Fizyoloji"`) |
| `knowledgePoints` | Relation → ExamQuestionKnowledgePoint (join table) |

**Enum `AnalysisStatus`:** `PENDING`, `ANALYZED` (and likely `FAILED` — not confirmed in this file)

### KnowledgePoint
*Searched: `normalizedKey`, `sourceCount`, `atomicityStatus`, `isActive`, `reviewStatus`, `splitFromId`*

| Field | Notes |
|---|---|
| `id` | UUID PK |
| `normalizedKey` | Unique string — dedup key, generated from statement text |
| `fact` | The atomic knowledge statement |
| `source` | Enum — `APPROVED_CONTENT`, `EXAM_ANALYSIS` |
| `priority` | Int — higher = more important; bumped on repeated sources |
| `examRelevance` | Float — 0-1 scale |
| `examPattern` | String — from `payload.patternType` |
| `sourceCount` | Int — incremented each time a new source produces the same KP |
| `classificationConfidence` | Float — OCR confidence from parent block |
| `lessonId` | FK → Lesson |
| `topicId` | FK → Topic |
| `subtopicId` | FK → Subtopic |
| `approvedContentId` | FK → ApprovedContent (when source = APPROVED_CONTENT) |
| `blockId` | FK → ParsedBlock |
| `createdFromExamQuestionId` | FK → ExamQuestion (when source = EXAM_ANALYSIS) |
| `flashcards` | Relation → Flashcard |
| `questionKnowledgePoints` | Relation → ExamQuestionKnowledgePoint |

**Not found in this file:** `atomicityStatus`, `isActive`, `reviewStatus`, `splitFromId` — these field names do not appear in `knowledge-extraction.service.ts`. May exist in schema or other services.

### Flashcard
*Fields not directly visible in this file. Inferred from relations:*
- Linked to `KnowledgePoint` via `knowledgePointId`
- Generation is **manual-only** as of current implementation (commented note in `saveKnowledgePoints`)

### ExamQuestionKnowledgePoint (Join Table)
| Field | Notes |
|---|---|
| `examQuestionId` | FK → ExamQuestion |
| `knowledgePointId` | FK → KnowledgePoint |
| `relationshipType` | String — `MEASURED`, `TRAP`, `CLINICAL_OUTCOME` |

---

## 3) Current Flows

### 3.1 ExamQuestion Analysis Flow

*Entry: Not visible in this file. Inferred from `analysisStatus` check and AI router call pattern.*

- Admin/processor calls analysis endpoint → `analysisStatus` is checked before KP generation
- Analysis result is stored in `examQuestion.analysisPayload` (JSON blob)
- AI task type used: `AITaskType.KNOWLEDGE_EXTRACTION` is called from `fizyolojiQuestionToKnowledgePointTemplate` with raw question data
- For Anatomi: No AI call for analysis-to-KP — payload fields are read directly
- `analysisStatus` must equal `"ANALYZED"` before `generateKnowledgePointsFromExamQuestion` will proceed

**Exact guard (in `generateKnowledgePointsFromExamQuestion`):**
```typescript
if (examQuestion.analysisStatus !== 'ANALYZED') → throw BadRequestException
if (!examQuestion.analysisPayload) → throw BadRequestException
if (existing knowledgePoints for examQuestionId) → throw BadRequestException
```

### 3.2 KnowledgePoint Generation Flow

**Path A — From ApprovedContent:**

`extractKnowledgePoints(approvedContentId)` →
- Fetch `ApprovedContent` + `ParsedBlock` + `Lesson/Topic/Subtopic`
- Call `aiRouter.runTask(AITaskType.KNOWLEDGE_EXTRACTION, { content, ... })`
- Parse JSON response (with markdown fence stripping)
- Check `requiresSplit` flag → if true, return `[]` (no KPs saved)
- Generate `normalizedKey` via `generateNormalizedKey(statement)`
- Return `ExtractedKnowledgePoint[]`

`saveKnowledgePoints(approvedContentId, knowledgePoints[])` →
- For each KP: `prisma.knowledgePoint.findUnique({ where: { normalizedKey } })`
- **If exists:** `update` — increment `sourceCount`, update `fact`, `topicId`, `subtopicId`, `approvedContentId`
- **If new:** `create` — with `source: 'APPROVED_CONTENT'`, `priority: 0`, `sourceCount: 1`
- Track IDs needing flashcards/questions (but **do not queue** — manual only)

**Path B — From ExamQuestion (Anatomi):**

`generateKnowledgePointsFromExamQuestion(examQuestionId)` →
dispatches to `anatomiQuestionToKnowledgePointTemplate(examQuestion, examQuestionId)` →
- Read `payload.spotRule` → upsert KP, create `ExamQuestionKnowledgePoint` with `MEASURED`
- Read `payload.clinicalCorrelation` → upsert KP, create join with `MEASURED`
- Read `payload.examTrap.keyDifference` → upsert KP, create join with `TRAP`
- Iterate `payload.optionAnalysis[]` → upsert KPs from `clinicalOutcome` where `importance === 'HIGH'` or substantial fact, create join with `CLINICAL_OUTCOME`
- All upserts: `priority` bumped on update, `examRelevance` boosted

**Path C — From ExamQuestion (Fizyoloji):**

`fizyolojiQuestionToKnowledgePointTemplate(examQuestion, examQuestionId)` →
- Call `aiRouter.runTask(AITaskType.KNOWLEDGE_EXTRACTION, { question, options, correctAnswer, explanation, analysisPayload, lesson, topic, subtopic })`
- Parse response → iterate `extractedKPs.knowledgePoints[]`
- For each: upsert `KnowledgePoint`, create `ExamQuestionKnowledgePoint` with `relationshipType` from AI response or default `MEASURED`
- On AI failure: catch error, log, return empty `createdKpIds` (no fallback extraction)

**Deduplication:** Solely via `normalizedKey` unique constraint. `generateNormalizedKey()` normalizes Turkish chars, strips stop words, truncates at 100 chars, falls back to SHA-256 hash prefix if result < 3 chars.

**Atomicity validation:** Not found in this file. No `atomicityStatus` check or enforcement visible.

### 3.3 Flashcard Generation Flow

From `saveKnowledgePoints`:
- `knowledgePointIdsForFlashcards` list is populated (new KPs always added; existing KPs added only if `flashcards.length === 0`)
- `knowledgePointIdsForQuestions` list populated only for existing KPs with `priority > 0`
- **Neither queue is actually invoked** — both lists are only logged at `debug` level
- Comment states: *"Flashcard and question generation are now MANUAL ONLY"*
- Manual trigger: `POST /admin/topics/:topicId/generate-flashcards`

**KP filter for flashcard eligibility (as visible here):**
- `existing.flashcards.length === 0` — only KPs without any flashcard
- No `isActive`, `atomicityStatus`, or `reviewStatus` filter visible in this file

---

## 4) AI Layer Inventory

### Services
- `AIRouterService` (`api/src/ai/ai-router.service.ts`) — central dispatch
- Method called: `aiRouter.runTask(taskType: AITaskType, payload: object)`
- Returns raw string (may contain markdown-fenced JSON)

### Task Types
- Enum: `AITaskType` — imported from `api/src/ai/types`
- Used in this file: `AITaskType.KNOWLEDGE_EXTRACTION` (used for both content extraction and Fizyoloji question→KP)
- Other types likely exist (e.g., for question analysis) — not visible here

### Prompt/Task Routing
- Lesson-specific routing for KP generation: handled **inside `generateKnowledgePointsFromExamQuestion`** via `switch(examQuestion.lesson?.name)` — cases: `"Anatomi"` (template), `"Fizyoloji"` (AI), `default` (throws)
- Whether `AIRouterService` itself performs lesson-based prompt selection is **not visible** from this file

### Prompt Files
| Prompt | Status |
|---|---|
| Physiology question analysis prompt | **Not found** in this file |
| Question→KP extraction prompt (Fizyoloji) | Delegated to `AIRouterService.runTask(AITaskType.KNOWLEDGE_EXTRACTION, ...)` — prompt location unknown from this file |
| Anatomy extraction | No AI prompt — direct field mapping from `analysisPayload` |
| Atomicity prompt | **Not found** |

**Exact paths not determinable from this file alone:**
Prompt definitions would be in `api/src/ai/` — exact filenames not confirmed.

---

## 5) Queues / Jobs Inventory

### Queue Declarations (from `QueueName` enum, `api/src/queue/queues.ts`)

| Queue Name | Constant |
|---|---|
| `QueueName.KNOWLEDGE_EXTRACTION` | Used for KP extraction jobs |
| `QueueName.FLASHCARD_GENERATION` | Injected but not actively enqueued here |
| `QueueName.QUESTION_GENERATION` | Injected but not actively enqueued here |

### Jobs

**Job: `extract-knowledge-exam-question`**
- Queue: `QueueName.KNOWLEDGE_EXTRACTION`
- Enqueued by: `queueKnowledgePointGenerationForExamQuestions(examQuestionIds[])`
- Payload: `{ examQuestionId: string }`
- Options: `attempts: 3`, `backoff: exponential 2000ms`, `jobId: kp-gen-${examQuestionId}`
- Processor handler: **not visible in this file** — would be in a processor class consuming `KNOWLEDGE_EXTRACTION` queue

**Flashcard / Question generation jobs:**
- Both queues are injected (`@InjectQueue`) but `addBulk` / `add` is never called in this file
- Generation is commented out and marked manual-only

### Bulk Queuing
`queueKnowledgePointGenerationForExamQuestions` uses `knowledgeExtractionQueue.addBulk(jobs)` for batch submission after pre-validating:
1. ExamQuestion exists
2. `analysisStatus === 'ANALYZED'`
3. `analysisPayload` is non-null
4. `_count.knowledgePoints === 0` (skips if already has KPs)

---

## 6) Integration Points to Be Careful About

- **Flashcard generation gate:** `existing.flashcards.length === 0` — if a KP already has even one flashcard, it will not be re-queued, even if content changes
- **KP dedup key:** `normalizedKey` uniqueness is the sole dedup mechanism. Two semantically different statements that normalize to the same key will collide and the existing record will be updated (not created)
- **`sourceCount`:** incremented on every update — not on create for path A (set to `1`). For exam-derived KPs, upsert's `update` branch increments it, meaning re-running extraction will inflate the count
- **`analysisStatus` hard gate:** `generateKnowledgePointsFromExamQuestion` throws `BadRequestException` if status is not exactly `"ANALYZED"` — any other string (e.g., `"analyzed"` lowercase or `"COMPLETE"`) blocks execution
- **`createdFromExamQuestionId` uniqueness:** `findFirst({ where: { createdFromExamQuestionId } })` is used as an idempotency check — if any KP with that FK exists, the entire generation throws; there is no partial-retry path
- **Fizyoloji AI fallback:** On AI error, the method silently returns `{ knowledgePoints: [] }` — no error is re-thrown, no job retry is triggered
- **`topicId` / `subtopicId` resolution in `saveKnowledgePoints`:** Uses `findUnique` with composite key `name_lessonId` and `name_topicId`. If topic/subtopic names don't match exactly (case, whitespace), resolution silently fails and `null` is stored
- **Queue inject but no enqueue:** `flashcardGenerationQueue` and `questionGenerationQueue` are injected but never called — removing the inject or changing queue names would be a silent no-op currently, but would break if generation is re-enabled
- **`optionAnalysis` loop bug (Anatomi):** `payload.options` is checked for `Array.isArray`, but the loop iterates `payload.optionAnalysis` without a null-guard — if `options` exists but `optionAnalysis` is absent, this will throw a runtime error

---

## 7) Gaps / Unknowns

- **Not found: `atomicityStatus`** — searched throughout `knowledge-extraction.service.ts`; no field, no check, no enum. May exist in Prisma schema or a separate atomicity service.
- **Not found: `isActive`** — not present in any KP query or filter in this file.
- **Not found: `reviewStatus`** — not present in this file.
- **Not found: `splitFromId`** — `requiresSplit` flag exists in AI response type but no `splitFromId` field is written or read.
- **Not found: `mechanismChain`** — listed in `analysisPayload` keyword search; not accessed anywhere in this file. Likely present in Anatomi/Fizyoloji analysis payload but not extracted into a KP.
- **Not found: `promptVersion`** — not present in this file; prompt versioning unknown.
- **Not found: ExamQuestion analysis entrypoint** — the function that performs AI analysis and sets `analysisPayload` / `analysisStatus = 'ANALYZED'` is not in this file. Likely in `api/src/exam-question/exam-question.service.ts` or a processor.
- **Not found: Flashcard processor handler** — the BullMQ processor for `KNOWLEDGE_EXTRACTION` queue (handles `extract-knowledge-exam-question`) is not in this file.
- **Not found: Atomicity pipeline** — no service, queue, or prompt for validating/scoring KP atomicity was found in this file.
- **Partial: AI prompt files** — `AIRouterService` and `AITaskType` are imported but their internals are not in this file; prompt content and lesson-specific routing logic inside the router are unknown from this file alone.

---

## Quick Map — Top 10 Most Important Files

| # | File Path | Role |
|---|---|---|
| 1 | `api/src/knowledge-extraction/knowledge-extraction.service.ts` | Core KP extraction, upsert, exam→KP dispatch (this file) |
| 2 | `api/src/ai/ai-router.service.ts` | AI task routing, model selection, prompt dispatch |
| 3 | `api/src/ai/types.ts` | `AITaskType` enum — all task identifiers |
| 4 | `api/src/queue/queues.ts` | `QueueName` enum — all queue identifiers |
| 5 | `api/src/exam-question/exam-question.service.ts` | ExamQuestion analysis, `analysisPayload` persistence, `analysisStatus` transitions |
| 6 | `api/src/flashcard/flashcard.service.ts` | Flashcard generation logic, KP filter conditions |
| 7 | `api/src/knowledge-extraction/knowledge-extraction.processor.ts` | BullMQ processor for `KNOWLEDGE_EXTRACTION` queue |
| 8 | `prisma/schema.prisma` | Ground truth for all model fields including `atomicityStatus`, `isActive`, `reviewStatus` |
| 9 | `api/src/ai/prompts/` | Prompt definitions per task type and lesson |
| 10 | `api/src/admin/admin.controller.ts` | Manual trigger endpoints for flashcard/question generation |
