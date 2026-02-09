# Flashcard API Quick Reference

## Status-Based System

### Card Statuses
- `UNSEEN` - Never reviewed (no progress record exists)
- `EASY` - User marked as easy/mastered
- `MEDIUM` - User marked as medium difficulty (learning)
- `HARD` - User marked as hard/struggling

---

## API Endpoints

### 1. Create Study Session
```http
POST /api/student/flashcards/session
Content-Type: application/json

{
  "userId": "user-uuid",
  "lessonId": "lesson-uuid",          // optional
  "topicId": "topic-uuid",            // optional
  "statuses": ["UNSEEN", "HARD"],     // required - at least 1
  "limit": 20,                        // optional, default: 20
  "enablePatternWeighting": false     // optional, default: false
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-uuid",
  "totalCards": 20,
  "statuses": ["UNSEEN", "HARD"]
}
```

**Use Cases:**
- New cards only: `["UNSEEN"]`
- Review difficult: `["HARD"]`
- Review learning: `["MEDIUM"]`
- Review all progress: `["EASY", "MEDIUM", "HARD"]`
- Mixed review: `["UNSEEN", "HARD", "MEDIUM"]`

---

### 2. Get Next Card
```http
GET /api/student/flashcards/session/{sessionId}/next?userId={userId}
```

**Response:**
```json
{
  "success": true,
  "completed": false,
  "card": {
    "id": "card-uuid",
    "front": "Question text",
    "back": "Answer text",
    "cardType": "STRUCTURE_ID",
    "difficulty": "MEDIUM",
    "lesson": { "id": "...", "name": "...", "displayName": "..." },
    "topic": { "id": "...", "name": "...", "displayName": "..." }
  },
  "progress": {
    "status": "UNSEEN",
    "lastReview": null,
    "totalReviews": 0
  },
  "sessionInfo": {
    "remainingCards": 19,
    "totalCards": 20,
    "completedCards": 1
  }
}
```

**Session Complete:**
```json
{
  "success": true,
  "completed": true,
  "message": "Session completed",
  "totalReviewed": 20
}
```

---

### 3. Review Card
```http
POST /api/student/flashcards/{cardId}/review
Content-Type: application/json

{
  "userId": "user-uuid",
  "response": "HARD",              // EASY | MEDIUM | HARD
  "sessionId": "session-uuid"      // optional
}
```

**Response:**
```json
{
  "id": "progress-uuid",
  "userId": "user-uuid",
  "flashcardId": "card-uuid",
  "status": "HARD",
  "totalReviews": 1,
  "lastReview": "2026-02-04T16:22:10.000Z"
}
```

---

### 4. Get Daily Overview
```http
GET /api/student/flashcards/overview?userId={userId}
```

**Response:**
```json
{
  "success": true,
  "overview": {
    "anatomy": {
      "due": 15,        // HARD + MEDIUM cards
      "learning": 8,    // MEDIUM cards
      "new": 42         // UNSEEN cards
    },
    "physiology": {
      "due": 5,
      "learning": 3,
      "new": 18
    }
  },
  "lessons": [
    {
      "id": "lesson-uuid",
      "name": "anatomy",
      "displayName": "Anatomi",
      "topics": [...]
    }
  ]
}
```

---

### 5. Get Mastery by Lesson
```http
GET /api/student/flashcards/mastery?userId={userId}
```

**Response:**
```json
{
  "success": true,
  "mastery": {
    "anatomy": {
      "percentage": 35,
      "details": {
        "masteredCards": 42,      // EASY status
        "totalCards": 120,
        "lessonDisplayName": "Anatomi"
      }
    }
  }
}
```

---

### 6. Get Overall Stats
```http
GET /api/student/flashcards/stats?userId={userId}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalCards": 150,
    "totalReviews": 320,
    "masteredCards": 42,              // EASY status
    "cardsNeedingReview": 35,         // HARD + MEDIUM
    "accuracy": 78,
    "statusDistribution": {
      "easy": 42,
      "medium": 20,
      "hard": 15
    }
  }
}
```

---

### 7. Get Study Activity
```http
GET /api/student/flashcards/activity?userId={userId}&days=30
```

**Response:**
```json
{
  "success": true,
  "activity": [
    { "date": "2026-02-04", "count": 15 },
    { "date": "2026-02-03", "count": 8 },
    { "date": "2026-02-02", "count": 0 }
  ],
  "totalDays": 30
}
```

---

### 8. Toggle Favorite
```http
PATCH /api/student/flashcards/{cardId}/favorite
Content-Type: application/json

{
  "userId": "user-uuid",
  "isFavorite": true
}
```

---

## Common Patterns

### Study New Material
```typescript
// Session with only new cards
createSession({
  userId,
  lessonId: "anatomy",
  statuses: ["UNSEEN"],
  limit: 50
})
```

### Review Difficult Cards
```typescript
// Session with hard + medium cards
createSession({
  userId,
  lessonId: "anatomy",
  statuses: ["HARD", "MEDIUM"],
  limit: 30
})
```

### Mixed Review (Leitner-style)
```typescript
// New cards + difficult cards
createSession({
  userId,
  lessonId: "anatomy",
  statuses: ["UNSEEN", "HARD"],
  limit: 40
})
```

### Anatomy with Pattern Weighting
```typescript
// Prioritize LANDMARK cards (structural cards)
createSession({
  userId,
  lessonId: "anatomy",
  statuses: ["UNSEEN", "MEDIUM"],
  limit: 30,
  enablePatternWeighting: true  // STRUCTURE_ID gets 2x priority
})
```

---

## Error Responses

### Invalid Status
```json
{
  "statusCode": 400,
  "message": "Invalid statuses: WRONG. Valid: UNSEEN, EASY, MEDIUM, HARD"
}
```

### No Cards Found
```json
{
  "statusCode": 404,
  "message": "No cards found matching selected statuses: HARD"
}
```

### Session Not Found
```json
{
  "statusCode": 404,
  "message": "Session not found"
}
```

---

## Migration from Old API

### Old: Mode-Based Session
```diff
- POST /session { "mode": "SRS", "limit": 20 }
+ POST /session { "statuses": ["HARD", "MEDIUM"], "limit": 20 }

- POST /session { "mode": "LEARN", "limit": 30 }
+ POST /session { "statuses": ["UNSEEN"], "limit": 30 }

- POST /session { "mode": "WEAKNESS", "limit": 25 }
+ POST /session { "statuses": ["HARD"], "limit": 25 }
```

### Old: 4-Option Review
```diff
- POST /review { "response": "AGAIN" }
+ POST /review { "response": "HARD" }

- POST /review { "response": "HARD" }
+ POST /review { "response": "HARD" }

- POST /review { "response": "GOOD" }
+ POST /review { "response": "MEDIUM" }

- POST /review { "response": "EASY" }
+ POST /review { "response": "EASY" }
```

---

## Development Notes

### Testing Session Creation
```bash
curl -X POST http://localhost:3000/api/student/flashcards/session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "statuses": ["UNSEEN", "HARD"],
    "limit": 20,
    "enablePatternWeighting": true
  }'
```

### Testing Review
```bash
curl -X POST http://localhost:3000/api/student/flashcards/{cardId}/review \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "response": "EASY"
  }'
```

---

## Card Type Priority (Pattern Weighting)

When `enablePatternWeighting: true`:

**High Priority (2x):**
- `STRUCTURE_ID` - Basic anatomy structures
- `CONTENTS_OF_SPACE` - Anatomical spaces
- `TOPOGRAPHIC_MAP` - Spatial relationships

**Normal Priority (1x):**
- All other card types (CLINICAL_CORRELATION, TRAP, etc.)
