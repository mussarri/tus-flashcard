# Flashcard System Refactoring - Status-Based Implementation

## Overview
Successfully migrated the flashcard system from time-based Spaced Repetition (SM-2 algorithm) to a status-based filtering system where users label cards as UNSEEN, EASY, MEDIUM, or HARD.

## Changes Implemented

### 1. Database Schema Updates ✅
**File:** `api/prisma/schema.prisma`

- Made SRS fields nullable (deprecated but kept for backward compatibility):
  - `easeFactor: Float?`
  - `interval: Int?`
  - `repetitions: Int?`
  - `nextReview: DateTime?`
- Added composite indexes for efficient status-based filtering:
  - `@@index([userId, status])`
  - `@@index([userId, status, lastReview])`
- Status field already exists: `CardMasteryStatus` enum (UNSEEN, EASY, MEDIUM, HARD)

**Migration:** `20260204162210_status_based_flashcard_system`

---

### 2. Service Layer Refactoring ✅
**File:** `api/src/student/student-flashcard.service.ts`

#### A. `createSession()` - Complete Rewrite
**Old:** Accepted `mode: 'SRS' | 'LEARN' | 'WEAKNESS'`  
**New:** Accepts `statuses: string[]` for multi-select filtering

**Key Features:**
- **Multi-Status Selection**: Users can select combinations like `['UNSEEN', 'HARD']` to review both new and difficult cards
- **Fisher-Yates Shuffle**: Randomizes card order to prevent predictable patterns
- **Pattern-Based Weighting** (Optional): Prioritizes LANDMARK cards (STRUCTURE_ID, CONTENTS_OF_SPACE, TOPOGRAPHIC_MAP) with 2x probability for anatomy lessons
- **OR Query Logic**: Efficiently fetches cards matching any selected status

**Example Usage:**
```typescript
// Scenario 1: Only new cards
createSession({ userId, statuses: ['UNSEEN'], limit: 50 })

// Scenario 2: Review difficult cards
createSession({ userId, statuses: ['HARD', 'MEDIUM'], limit: 30 })

// Scenario 3: Mixed session with pattern weighting
createSession({ 
  userId, 
  statuses: ['UNSEEN', 'HARD'], 
  limit: 40,
  enablePatternWeighting: true 
})
```

---

#### B. `getDailyOverview()` - Status-Based Counts
**Changes:**
- **Due cards**: Now defined as `HARD + MEDIUM` (cards needing review)
- **Learning cards**: `MEDIUM` status only
- **New cards**: `UNSEEN` (no progress record)
- Removed `nextReview <= now` time-based filtering
- Removed `interval < 21 days` checks

---

#### C. `getNextCard()` - Simplified Response
**Removed Fields:**
- `easeFactor`
- `interval`
- `repetitions`
- `nextReview`

**Kept Fields:**
- `status` (UNSEEN/EASY/MEDIUM/HARD)
- `lastReview`
- `totalReviews`

---

#### D. `reviewCard()` - Already Status-Based ✅
**No changes needed** - this method was already correctly updating only the `status` field:
```typescript
async reviewCard(userId, cardId, response: 'EASY' | 'MEDIUM' | 'HARD') {
  return this.prisma.userFlashcardProgress.upsert({
    update: {
      status: response,
      totalReviews: { increment: 1 },
      lastReview: new Date(),
    },
    create: {
      status: response,
      totalReviews: 1,
      lastReview: new Date(),
    },
  });
}
```

---

#### E. `toggleFavorite()` - Removed SRS Defaults
**Old:** Created progress with `easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: now()`  
**New:** Creates with `status: 'UNSEEN'` only

---

#### F. `getMasteryByLesson()` - Status-Based Mastery
**Old:** Mastered = `interval >= 21 days`  
**New:** Mastered = `status === 'EASY'`

---

#### G. `getOverallStats()` - New Metrics
**Removed:**
- `matureCards` (interval >= 21)
- `dueToday` (nextReview <= now)
- `avgEaseFactor`

**Added:**
- `masteredCards` (status = EASY)
- `cardsNeedingReview` (status = HARD + MEDIUM)
- `statusDistribution`: { easy, medium, hard }

---

### 3. Controller Updates ✅
**File:** `api/src/student/student-flashcard.controller.ts`

#### A. Session Creation Endpoint
```typescript
POST /api/student/flashcards/session
Body: {
  userId: string;
  lessonId?: string;
  topicId?: string;
  statuses: string[];  // ['UNSEEN', 'HARD', 'MEDIUM']
  limit?: number;      // default: 20
  enablePatternWeighting?: boolean;  // default: false
}
```

#### B. Review Endpoint
**Old:** Accepted `'AGAIN' | 'HARD' | 'GOOD' | 'EASY'`  
**New:** Accepts `'EASY' | 'MEDIUM' | 'HARD'`

```typescript
POST /api/student/flashcards/:cardId/review
Body: {
  userId: string;
  response: 'EASY' | 'MEDIUM' | 'HARD';
  sessionId?: string;
}
```

---

### 4. Backward Compatibility Fixes ✅
**File:** `api/src/flashcard-generation/adaptive-algorithm.service.ts`

Added null coalescing operators (`??`) to handle deprecated nullable SRS fields:
```typescript
const easeFactor = progress.easeFactor ?? 2.5;
const interval = progress.interval ?? 1;
const repetitions = progress.repetitions ?? 0;
```

This service still uses SRS logic but won't crash if fields are null.

---

## API Migration Guide

### Old API (Deprecated)
```typescript
// Create session with SRS mode
POST /api/student/flashcards/session
{
  "userId": "user123",
  "mode": "SRS",  // or "LEARN", "WEAKNESS"
  "limit": 20
}

// Review with 4 options
POST /api/student/flashcards/:id/review
{
  "userId": "user123",
  "response": "AGAIN"  // or "HARD", "GOOD", "EASY"
}
```

### New API (Current)
```typescript
// Create session with status filtering
POST /api/student/flashcards/session
{
  "userId": "user123",
  "statuses": ["UNSEEN", "HARD"],
  "limit": 20,
  "enablePatternWeighting": true  // optional
}

// Review with 3 options
POST /api/student/flashcards/:id/review
{
  "userId": "user123",
  "response": "HARD"  // or "MEDIUM", "EASY"
}
```

---

## Data Migration Status

✅ **Existing Data Preserved:**
- All `status` values retained (UNSEEN, EASY, MEDIUM, HARD)
- Performance metrics intact (`totalReviews`, `correctCount`, `incorrectCount`)
- Trap detection fields preserved
- SRS fields set to `null` (soft deprecation)

⚠️ **Deprecated Fields (still in schema):**
- `easeFactor`, `interval`, `repetitions`, `nextReview`
- Can be removed completely after 1-2 months
- AdaptiveAlgorithmService still uses them (for backward compatibility)

---

## Key Benefits

### 1. **Simplified Mental Model**
- Users directly label difficulty (no hidden algorithm)
- Predictable behavior: "Show me all HARD cards"

### 2. **Flexible Study Sessions**
- Multi-select: `['UNSEEN', 'HARD']` → new + difficult cards together
- Pure modes: `['MEDIUM']` → only cards in progress

### 3. **Pattern-Based Prioritization**
- Anatomy lessons can enable LANDMARK weighting
- Structural cards (STRUCTURE_ID) get 2x probability
- Helps with hierarchical learning

### 4. **Performance Optimizations**
- Composite indexes: `(userId, status)` for fast filtering
- No time-based calculations (no nextReview computation)
- Efficient OR queries for multi-status selection

---

## Testing Recommendations

### 1. Session Creation
```bash
# Test UNSEEN only
POST /session { "statuses": ["UNSEEN"], "limit": 20 }

# Test HARD + MEDIUM
POST /session { "statuses": ["HARD", "MEDIUM"], "limit": 30 }

# Test pattern weighting (Anatomy lesson)
POST /session { 
  "statuses": ["UNSEEN"], 
  "lessonId": "anatomy-lesson-id",
  "enablePatternWeighting": true 
}
```

### 2. Review Flow
```bash
# Mark card as EASY
POST /flashcards/:id/review { "response": "EASY" }

# Mark card as HARD
POST /flashcards/:id/review { "response": "HARD" }
```

### 3. Analytics Validation
```bash
# Check status distribution
GET /flashcards/stats?userId=user123

# Check mastery (EASY cards)
GET /flashcards/mastery?userId=user123
```

---

## Future Enhancements (Optional)

### 1. **Prerequisite Backtracking**
When user marks CLINICAL_CORRELATION card as HARD:
1. Query `PrerequisiteLearningService` for prerequisite SPOT/STRUCTURE_ID cards
2. Inject unreviewed prerequisites into session queue
3. Track injected cards to avoid duplicates

**Implementation File:** Add to `getNextCard()` method in `student-flashcard.service.ts`

### 2. **Pattern Weight Configuration**
- Add `patternWeights` to `AIConfig` table
- Admin panel to configure per-lesson:
  ```json
  {
    "STRUCTURE_ID": 2.0,
    "CLINICAL_CORRELATION": 1.5,
    "TRAP": 1.0
  }
  ```

### 3. **Session Persistence (Redis/DB)**
Current in-memory `activeSessions` Map doesn't survive restarts.

**Option A:** Redis with TTL
```typescript
await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
```

**Option B:** Add `StudySession` table to Prisma schema

---

## Files Modified

1. ✅ `api/prisma/schema.prisma`
2. ✅ `api/src/student/student-flashcard.service.ts`
3. ✅ `api/src/student/student-flashcard.controller.ts`
4. ✅ `api/src/flashcard-generation/adaptive-algorithm.service.ts` (backward compat)

**Migration Created:** `20260204162210_status_based_flashcard_system`

---

## Status: ✅ COMPLETE

All core requirements implemented:
- ✅ Status-based filtering (UNSEEN/EASY/MEDIUM/HARD)
- ✅ Multi-select statuses support
- ✅ Fisher-Yates shuffle algorithm
- ✅ Pattern-based weighting (LANDMARK priority)
- ✅ Database migration completed
- ✅ API endpoints updated
- ✅ Backward compatibility maintained
- ✅ Build successful (TypeScript compilation)
