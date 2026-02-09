# Admin Prerequisite Detail Endpoint

## Overview
Comprehensive read-only inspection endpoint for the Admin Prerequisite Detail Page (`/admin/prerequisites/:id`). This endpoint provides all evidence and metrics required for admins to answer:

**"Is this prerequisite correctly defined, properly linked, and worth keeping or merging?"**

## Endpoint Details

### Route
```
GET /admin/prerequisites/:id
```

### Purpose
- **Read-heavy, decision-critical, admin-only**
- Provides complete inspection data for prerequisite evaluation
- **NO MODIFICATIONS**: This is inspection-only (no auto-merge, no auto-link, no delete)

## Request Parameters

### Path Parameters
- `id` (string, UUID, required): Prerequisite ID

### Query Parameters
```typescript
{
  lesson?: string;           // Default: 'Anatomi'
  includeEvidence?: boolean; // Default: false
  evidenceLimit?: number;    // Default: 10
  evidenceOffset?: number;   // Default: 0
}
```

## Response Structure

### Complete Response Schema
```typescript
{
  // 1️⃣ Prerequisite Core
  id: string;
  name: string;
  canonicalKey: string | null;
  createdAt: Date;
  updatedAt: Date;

  // 2️⃣ Concept Binding
  linkedConcepts: Array<{
    conceptId: string;
    preferredLabel: string;
    conceptType: string;     // STRUCTURE, FUNCTION, CLINICAL, etc.
    status: string;          // ACTIVE, MERGED, DEPRECATED
  }>;
  isConceptLess: boolean;   // Flag for prerequisites without concepts

  // 3️⃣ Topic & Subtopic Coverage
  topicCoverage: Array<{
    topicName: string;
    subtopic: string | null;
    frequency: number;
    strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  }>;
  totalFrequency: number;   // Sum of all edge frequencies
  maxStrength: 'WEAK' | 'MEDIUM' | 'STRONG';

  // 4️⃣ Exam Impact Metrics
  examMetrics: {
    examImportance: number; // Percentage (totalFrequency / total analyzed questions)
    totalFrequency: number;
    maxStrength: string;
    rank?: number;          // Rank among all prerequisites in same lesson
  };

  // 5️⃣ Pattern Context
  patternContext: Array<{
    patternType: string;    // e.g., "Spot Rule", "Clinical Tip"
    count: number;
  }>;

  // 6️⃣ Source Evidence (Optional / Paginated)
  sourceEvidence?: {
    questions: Array<{
      questionId: string;
      year: number;
      topic: string | null;
      subtopic: string | null;
      patternType: string | null;
    }>;
    total: number;
  };

  // 7️⃣ Merge Candidates
  mergeCandidates: Array<{
    prerequisiteId: string;
    name: string;
    similarityScore: number;
    reasons: string[];      // e.g., "3 shared concepts", "High name similarity (85%)"
  }>;
}
```

## Implementation Details

### 1️⃣ Prerequisite Core
Fetched directly from `Prerequisite` table with relations:
```typescript
await prisma.prerequisite.findUnique({
  where: { id },
  include: {
    concepts: { include: { concept: true } },
    edges: { include: { topic: true } },
  },
});
```

### 2️⃣ Concept Binding
- Maps `PrerequisiteConcept` → `Concept` relation
- Includes concept metadata (type, status)
- Flags `isConceptLess` for prerequisites needing concept mapping

### 3️⃣ Topic & Subtopic Coverage
- Fetched from `PrerequisiteTopicEdge` relations
- Ordered by frequency descending
- Calculates:
  - `totalFrequency`: Sum of all edge frequencies
  - `maxStrength`: Highest strength level (STRONG > MEDIUM > WEAK)

### 4️⃣ Exam Impact Metrics
Calculation logic:
```typescript
// Get total analyzed questions in lesson
const totalQuestionsForLesson = await prisma.examQuestion.count({
  where: { lesson, analysisStatus: 'ANALYZED' }
});

// Calculate exam importance percentage
const examImportance = (totalFrequency / totalQuestionsForLesson) * 100;

// Calculate rank
// Fetch all prerequisites in same lesson, calculate their frequencies, sort desc
const rank = findIndex(prerequisiteId) + 1;
```

### 5️⃣ Pattern Context
Since `ExamQuestion` doesn't have direct prerequisite relations in schema, we infer from topics:
```typescript
// Get topics that have this prerequisite
const topicsWithThisPrerequisite = prerequisite.edges.map(edge => edge.topic.name);

// Find questions in those topics
const questions = await prisma.examQuestion.findMany({
  where: {
    lesson,
    topic: { in: topicsWithThisPrerequisite },
    analysisStatus: 'ANALYZED',
  },
});

// Group by patternType
const patternMap = new Map<string, number>();
for (const q of questions) {
  const pattern = q.patternType || 'UNKNOWN';
  patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
}
```

### 6️⃣ Source Evidence (Optional / Paginated)
Only included when `includeEvidence=true`:
```typescript
if (includeEvidence) {
  const questions = await prisma.examQuestion.findMany({
    where: {
      lesson,
      topic: { in: topicsWithThisPrerequisite },
      analysisStatus: 'ANALYZED',
    },
    skip: evidenceOffset,
    take: evidenceLimit,
    orderBy: { year: 'desc' },
  });
  
  return {
    questions: [...],
    total: await prisma.examQuestion.count({ where: {...} }),
  };
}
```

### 7️⃣ Merge Candidates
**Similarity Scoring Algorithm:**

```typescript
function calculateSimilarity(current, other) {
  let score = 0;
  const reasons = [];

  // 1. Shared Concepts (strongest signal)
  const sharedConcepts = intersection(current.concepts, other.concepts);
  if (sharedConcepts.length > 0) {
    score += sharedConcepts.length * 30;
    reasons.push(`${sharedConcepts.length} shared concept(s)`);
  }

  // 2. Overlapping Topics
  const sharedTopics = intersection(current.topics, other.topics);
  if (sharedTopics.length > 0) {
    score += sharedTopics.length * 10;
    reasons.push(`${sharedTopics.length} shared topic(s)`);
  }

  // 3. Name Similarity (Levenshtein distance)
  const nameSimilarity = levenshteinSimilarity(current.name, other.name);
  if (nameSimilarity > 0.7) {
    score += Math.floor(nameSimilarity * 20);
    reasons.push(`High name similarity (${Math.floor(nameSimilarity * 100)}%)`);
  }

  return { score, reasons };
}
```

**Scoring Weights:**
- **Shared Concepts**: 30 points per concept (strongest signal)
- **Shared Topics**: 10 points per topic
- **Name Similarity**: Up to 20 points (only if >70% similar)

**Output:**
- Top 10 candidates ranked by score
- Only includes candidates with score > 0
- ⚠️ **Suggestions only** - no auto-merge

## Usage Examples

### Basic Request
```bash
GET /admin/prerequisites/550e8400-e29b-41d4-a716-446655440000
```

### With Lesson Filter
```bash
GET /admin/prerequisites/550e8400-e29b-41d4-a716-446655440000?lesson=Anatomi
```

### With Evidence (Paginated)
```bash
GET /admin/prerequisites/550e8400-e29b-41d4-a716-446655440000?includeEvidence=true&evidenceLimit=20&evidenceOffset=0
```

## Response Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Kranial sinir çıkış foramenlerini bilmek",
  "canonicalKey": "kranial-sinir-cikis-foramenlerini-bilmek",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:45:00Z",
  
  "linkedConcepts": [
    {
      "conceptId": "123e4567-e89b-12d3-a456-426614174000",
      "preferredLabel": "Foramen rotundum",
      "conceptType": "STRUCTURE",
      "status": "ACTIVE"
    },
    {
      "conceptId": "123e4567-e89b-12d3-a456-426614174001",
      "preferredLabel": "Nervus trigeminus",
      "conceptType": "STRUCTURE",
      "status": "ACTIVE"
    }
  ],
  "isConceptLess": false,
  
  "topicCoverage": [
    {
      "topicName": "Skull base",
      "subtopic": "Foramina",
      "frequency": 15,
      "strength": "STRONG"
    },
    {
      "topicName": "Cranial nerves",
      "subtopic": null,
      "frequency": 8,
      "strength": "MEDIUM"
    }
  ],
  "totalFrequency": 23,
  "maxStrength": "STRONG",
  
  "examMetrics": {
    "examImportance": 5.75,
    "totalFrequency": 23,
    "maxStrength": "STRONG",
    "rank": 3
  },
  
  "patternContext": [
    {
      "patternType": "Spot Rule",
      "count": 12
    },
    {
      "patternType": "Clinical Tip",
      "count": 7
    },
    {
      "patternType": "Comparison",
      "count": 4
    }
  ],
  
  "sourceEvidence": {
    "questions": [
      {
        "questionId": "q-2024-001",
        "year": 2024,
        "topic": "Skull base",
        "subtopic": "Foramina",
        "patternType": "Spot Rule"
      }
    ],
    "total": 23
  },
  
  "mergeCandidates": [
    {
      "prerequisiteId": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Kranial sinir geçiş noktalarını bilmek",
      "similarityScore": 85,
      "reasons": [
        "2 shared concepts",
        "3 shared topics",
        "High name similarity (88%)"
      ]
    },
    {
      "prerequisiteId": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Kafatası foramenlerini bilmek",
      "similarityScore": 40,
      "reasons": [
        "1 shared concept",
        "2 shared topics"
      ]
    }
  ]
}
```

## Database Queries

### Total Queries Executed
- 1 query: Fetch prerequisite with concepts and edges
- 1 query: Count total analyzed questions in lesson
- 1 query: Fetch topics in lesson (for ranking)
- 1 query: Fetch all prerequisites in lesson (for ranking)
- 1 query: Fetch questions for pattern context
- 2 queries (optional): Source evidence questions + count
- 1 query: Fetch other prerequisites (for merge candidates)

**Total: ~6-8 queries per request** (8 if evidence included)

### Performance Considerations
- Most queries are indexed (lesson, topic, status)
- Merge candidate calculation is in-memory (no additional queries)
- Evidence pagination keeps response size manageable
- Pattern grouping done in application layer

## Error Handling

### Not Found
```typescript
if (!prerequisite) {
  throw new Error(`Prerequisite with ID ${id} not found`);
}
```

### Invalid UUID
```typescript
// Handled by ParseUUIDPipe in controller
@Param('id', ParseUUIDPipe) id: string
```

### Database Errors
Logged and wrapped in HTTP 500 response by controller.

## Security Considerations

- ✅ **Admin-only endpoint** (should be protected by auth middleware)
- ✅ **Read-only**: No mutations possible
- ✅ **UUID validation**: Prevents injection
- ✅ **No sensitive data exposure**: Only internal admin data

## Frontend Integration

This endpoint powers the Admin Prerequisite Detail Page which displays:

1. **Header Section**: Name, canonical key, concept link status
2. **Metrics Dashboard**: Exam importance, rank, frequency
3. **Topic Coverage Table**: Topics, subtopics, strength badges
4. **Pattern Distribution Chart**: Visual breakdown of pattern types
5. **Concept Mapping Panel**: Linked concepts with status
6. **Evidence Viewer**: Paginated question examples
7. **Merge Suggestions Panel**: Ranked merge candidates with reasons

## Future Enhancements

### Planned Features
1. **Co-occurrence Analysis**: Score based on prerequisites appearing together in same questions
2. **Temporal Trends**: Show how exam importance changes over years
3. **Concept Coverage Score**: Percentage of prerequisite meaning captured by linked concepts
4. **Auto-suggest Concepts**: ML-based concept recommendations
5. **Bulk Operations**: Select multiple merge candidates at once

### Potential Optimizations
1. **Caching**: Cache exam impact metrics (recalculate on question analysis)
2. **Materialized Views**: Pre-aggregate pattern context
3. **Batch Endpoints**: Get details for multiple prerequisites at once

## Testing

### Unit Tests
- [ ] DTO validation (query params)
- [ ] Similarity scoring algorithm
- [ ] Strength calculation (maxStrength)
- [ ] Pattern grouping logic

### Integration Tests
- [ ] Full endpoint response structure
- [ ] Evidence pagination
- [ ] Merge candidate ranking
- [ ] Lesson filtering
- [ ] Error handling (not found, invalid UUID)

### Manual Test Cases
1. **Concept-less prerequisite**: Verify `isConceptLess=true`
2. **High-frequency prerequisite**: Check rank calculation
3. **No merge candidates**: Empty array returned
4. **Evidence pagination**: Verify offset/limit work correctly
5. **Unknown pattern types**: Grouped as "UNKNOWN"

## Conclusion

This endpoint provides comprehensive, actionable data for admin decision-making on prerequisites. It balances depth (7 information sections) with performance (efficient queries, optional pagination) while maintaining a strict read-only policy to prevent accidental modifications.

The merge candidate algorithm uses multi-factor scoring to suggest similar prerequisites, but **never auto-merges** - all decisions remain with the admin user.
