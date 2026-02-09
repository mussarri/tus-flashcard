# System Hardening & Guardrails Documentation

## Overview

This document describes the system hardening and guardrails implemented for the content → knowledge → flashcard pipeline to make it deterministic, traceable, and safe against AI or admin mistakes.

## 1. Lesson-Flashcard Type Enforcement (CRITICAL)

### Implementation

- **Database Schema**: `LessonFlashcardType` table maps lessons to allowed flashcard types
- **Validation**: `FlashcardTypeValidator` service validates all flashcard types before saving
- **Enforcement**: Flashcard generation service rejects invalid types with clear error messages

### Rules

- Every flashcard MUST belong to a lesson (via `KnowledgePoint.category`)
- Flashcard type MUST be allowed for that lesson according to `LessonFlashcardType` mapping
- Invalid flashcard types are REJECTED, not silently skipped

### Error Message

```
"Flashcard type not allowed for this lesson. Lesson: {lesson}, CardType: {cardType}"
```

### Default Mappings

All lessons (Dahiliye, Pediatri, Nöroloji, etc.) allow all card types (SPOT, TRAP, CLINICAL_TIP, COMPARISON) by default. This can be customized per lesson.

## 2. Knowledge Extraction Duplicate Protection

### Implementation

- **Status Check**: `StateMachineValidator.canTriggerExtraction()` validates status before extraction
- **Allowed States**: Only `NOT_STARTED` or `VERIFIED` (for reprocessing) allow extraction
- **Blocking**: Duplicate extraction attempts are logged and rejected

### Status Flow

```
NOT_STARTED → QUEUED → PROCESSING → COMPLETED → VERIFIED
                                    ↓
                                  FAILED (can retry)
```

### Reprocessing

To reprocess completed content, admin must explicitly reset status to `NOT_STARTED`.

## 3. State Machine Consistency

### Batch States

```
UPLOADED → CLASSIFIED → REVIEWED → KNOWLEDGE_EXTRACTED → COMPLETED
         ↓
      CANCELLED (terminal)
```

### ApprovedContent Extraction States

```
NOT_STARTED → QUEUED → PROCESSING → COMPLETED → VERIFIED
            ↓                                    ↓
         (can reset)                        (can reset)
```

### Validation

- `StateMachineValidator` enforces valid transitions
- Invalid transitions throw `BadRequestException` with clear error messages
- All state changes are logged

## 4. Generation Coverage Reporting

### Response Format

After flashcard generation, the API returns:

```json
{
  "queued": 38,
  "skipped": 4,
  "deleted": 0,
  "coverage": {
    "total": 42,
    "used": 38,
    "skipped": 4,
    "reasons": {
      "already_has_flashcards": 2,
      "no_lesson": 1,
      "queue_failed": 1
    }
  }
}
```

### Skip Reasons

- `already_has_flashcards`: Knowledge point already has flashcards (APPEND mode)
- `no_lesson`: Knowledge point missing category (lesson)
- `queue_failed`: Failed to queue generation job

## 5. Confidence & Traceability

### Stored Data

- **`KnowledgePoint.classificationConfidence`**: AI confidence score (0-1) for lesson/topic classification
- **`KnowledgePoint.sourceCount`**: Number of sources this knowledge point derived from
- **`Flashcard.lesson`**: Lesson derived from KnowledgePoint.category

### Display in Admin UI

- Show "AI confidence: 0.82" for knowledge points
- Show "Derived from 3 sources" for knowledge points with multiple sources

## 6. Safe Manual Triggers

### Validation Rules

**Knowledge Extraction:**
- Content must be approved (`ApprovedContent` exists)
- Status must be `NOT_STARTED` or `VERIFIED` (for reprocessing)
- Button disabled if conditions not met

**Flashcard Generation:**
- Knowledge points must exist for topic
- Knowledge points must have valid lesson (category)
- Button shows warning if no eligible knowledge points

### User-Friendly Warnings

Frontend displays clear warnings:
- "Content already processed. Reset to NOT_STARTED to reprocess."
- "No eligible knowledge points found. Ensure all have valid lessons."

## 7. Logging & Audit

### Audit Log Table

`AdminAuditLog` records:
- Admin user ID
- Action type (KNOWLEDGE_EXTRACTION, FLASHCARD_GENERATION, etc.)
- Action mode (APPEND, REPLACE)
- AI provider used
- Affected entities (batchId, topicId, etc.)
- Results (success, counts, errors)
- Timestamp

### Logged Actions

- Knowledge extraction triggers
- Flashcard generation triggers
- Question generation triggers
- All admin-initiated operations

### Purpose

- Debug issues
- Track AI costs
- Accountability
- Audit trail

## Migration Steps

1. Run Prisma migration:
   ```bash
   cd api && npx prisma migrate dev
   ```

2. Initialize default lesson-flashcard type mappings:
   ```typescript
   // Call FlashcardTypeValidator.initializeDefaultMappings() on startup
   ```

3. Update frontend to:
   - Show coverage reports after generation
   - Display confidence scores
   - Show source counts
   - Validate before triggering actions

## Important Principles

1. **Never auto-generate**: All generation must be manually triggered by admin
2. **Never allow mismatches**: Lesson/type mismatches are rejected
3. **Prefer rejection**: Invalid data is rejected, not silently accepted
4. **Full traceability**: All actions are logged and traceable
5. **Deterministic**: State transitions are strictly enforced

## API Changes

### Updated Endpoints

- `POST /admin/topics/:topicId/generate-flashcards` - Now returns coverage report
- `POST /admin/approved-contents/:id/extract-knowledge` - Validates status before extraction
- `POST /admin/batches/:id/extract-knowledge` - Validates status before extraction

### New Validations

- Flashcard type validation on generation
- Extraction status validation
- State machine transition validation
