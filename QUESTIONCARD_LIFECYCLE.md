# QuestionCard Lifecycle Implementation

**Author**: Senior Backend Engineer  
**Date**: January 27, 2026  
**System**: TUS Medical Exam Intelligence Platform

---

## Overview

This document describes the **complete QuestionCard lifecycle**, from creation to student usage, analytics, and adaptive learning. QuestionCard is the **measurement unit** in our system (not a teaching tool). It measures student knowledge through practice questions, tracks weaknesses, and enables intelligent remediation.

---

## Table of Contents

1. [QuestionCard Model](#questioncard-model)
2. [Creation Flows](#creation-flows)
   - [EXAM_REPLICA (ADMIN)](#1-exam_replica-admin-source)
   - [AI_GENERATION](#2-ai_generation-source)
   - [ERROR_BASED](#3-error_based-source)
3. [Spatial Context Handling](#spatial-context-handling)
4. [Knowledge Point Linking](#knowledge-point-linking)
5. [Admin Review Flow](#admin-review-flow)
6. [Student Solve Flow](#student-solve-flow)
7. [Analytics & Intelligence](#analytics--intelligence)
8. [API Endpoints](#api-endpoints)
9. [Design Principles](#design-principles)

---

## QuestionCard Model

### Core Schema

```prisma
model QuestionCard {
  id String @id @default(uuid())
  
  // Source identification
  sourceType QuestionCardSource  // ADMIN | AI_GENERATION | ERROR_BASED
  
  // Question content
  question String
  options Json  // { A: "...", B: "...", C: "...", D: "...", E: "..." }
  correctAnswer String
  explanation String?
  
  // Analysis metadata
  patternType String?  // "Spot Rule", "Clinical Tip", etc.
  difficulty Difficulty?  // EASY, MEDIUM, HARD
  clinicalCorrelation String?
  
  // Ontology links
  prerequisiteId String?
  prerequisite Prerequisite?
  topicId String?
  topic Topic?
  subtopicId String?
  subtopic Subtopic?
  lessonId String
  lesson Lesson
  
  // Option analysis
  optionsMetadata Json?  // { A: { text, wouldBeCorrectIf, isCorrect }, ... }
  mainExplanation String?
  
  // Source tracking
  sourceExamQuestionId String?
  sourceExamQuestion ExamQuestion?
  
  // Knowledge point relations (junction table)
  questionKnowledgePoints QuestionKnowledgePoint[]
  
  // Spatial context (anatomy-critical)
  spatialContexts GeneratedQuestionSpatialContext[]
  
  // Approval workflow
  approvalStatus ApprovalStatus @default(PENDING)  // PENDING | APPROVED | REJECTED | DELETED
  approvedAt DateTime?
  approvedBy String?
  
  // Analytics
  timesShown Int @default(0)
  correctRate Float?
  
  // Similarity tracking
  similarityChecked Boolean @default(false)
  similarQuestionIds String[]
  questionEmbedding Float[]?
  
  // User interactions
  userAnswers UserAnswer[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum QuestionCardSource {
  ADMIN         // Exam replica questions (from ExamQuestion)
  AI_GENERATION // Generated from KnowledgePoint
  ERROR_BASED   // Generated from user mistakes (UserWeakness)
}
```

---

## Creation Flows

### 1. EXAM_REPLICA (ADMIN) Source

**Purpose**: Convert analyzed exam questions into practice QuestionCards.

**Trigger**: Admin initiates from ExamQuestion (after analysis complete).

**Flow**:

```typescript
// Step 1: Fetch analyzed ExamQuestion
const examQuestion = await prisma.examQuestion.findUnique({
  where: { id: examQuestionId },
  include: { lesson, topic, subtopic }
});

// analysisPayload structure (from AI analysis):
{
  spotRule: "Myocardial infarction ECG shows ST elevation in leads II, III, aVF → Inferior MI",
  optionAnalysis: [
    { option: "A", label: "Anterior MI", wouldBeCorrectIf: "ST elevation in V1-V4", isCorrect: false },
    { option: "B", label: "Inferior MI", wouldBeCorrectIf: "Always correct", isCorrect: true },
    ...
  ],
  spatialContext: ["Left ventricle", "Right coronary artery", "Inferior wall"],
  clinicalCorrelation: "RCA occlusion typically causes inferior MI",
  examTrap: { keyDifference: "...", correctReasoning: "..." },
  patternType: "Spot Rule",
  patternConfidence: 0.92
}

// Step 2: Extract spotRule → KnowledgePoint
const normalizedKey = normalizeText(payload.spotRule);
const knowledgePoint = await prisma.knowledgePoint.upsert({
  where: { normalizedKey },
  create: {
    fact: payload.spotRule,
    source: 'EXAM_ANALYSIS',
    lessonId: examQuestion.lessonId,
    topicId: examQuestion.topicId,
    subtopicId: examQuestion.subtopicId,
    normalizedKey,
    createdFromExamQuestionId: examQuestionId,
  },
  update: { sourceCount: { increment: 1 } }
});

// Step 3: Map optionsMetadata from optionAnalysis
const optionsMetadata = {};
for (const opt of payload.optionAnalysis) {
  optionsMetadata[opt.option] = {
    text: opt.label,
    wouldBeCorrectIf: opt.wouldBeCorrectIf || null,
    isCorrect: opt.isCorrect
  };
}

// Step 4: Derive difficulty from patternConfidence
const difficulty = payload.patternConfidence > 0.85 ? 'EASY' 
                 : payload.patternConfidence > 0.6 ? 'MEDIUM' 
                 : 'HARD';

// Step 5: Create QuestionCard (ADMIN = EXAM_REPLICA)
const questionCard = await prisma.questionCard.create({
  data: {
    sourceType: 'ADMIN',  // EXAM_REPLICA
    question: examQuestion.question,
    options: examQuestion.options,
    correctAnswer: examQuestion.correctAnswer,
    optionsMetadata,
    mainExplanation: payload.spotRule,
    difficulty,
    patternType: payload.patternType,
    clinicalCorrelation: payload.clinicalCorrelation,
    sourceExamQuestionId: examQuestionId,
    lessonId: examQuestion.lessonId,
    topicId: examQuestion.topicId,
    subtopicId: examQuestion.subtopicId,
    approvalStatus: 'APPROVED',  // Auto-approved (exam replica)
    approvedAt: new Date(),
  }
});

// Step 6: Link KnowledgePoint
await prisma.questionKnowledgePoint.create({
  data: {
    questionCardId: questionCard.id,
    knowledgePointId: knowledgePoint.id,
    relationshipType: 'MEASURED'
  }
});

// Step 7: Link spatial contexts (anatomy)
for (const spatialLabel of payload.spatialContext) {
  const concept = await findConceptByLabel(spatialLabel);
  if (concept) {
    await prisma.generatedQuestionSpatialContext.create({
      data: {
        questionCardId: questionCard.id,
        conceptId: concept.id
      }
    });
  }
}
```

**Key Points**:
- **Auto-approved**: EXAM_REPLICA questions skip admin review (trusted source)
- **spotRule → KnowledgePoint**: Creates reusable teaching unit
- **Spatial context**: Critical for anatomy intelligence
- **Difficulty mapping**: patternConfidence → difficulty

---

### 2. AI_GENERATION Source

**Purpose**: Generate new practice questions from KnowledgePoints.

**Trigger**: Admin requests generation from a KnowledgePoint, or automated generation.

**Flow**:

```typescript
// Step 1: Fetch KnowledgePoint
const knowledgePoint = await prisma.knowledgePoint.findUnique({
  where: { id: knowledgePointId },
  include: { lesson, topic, subtopic }
});

// Step 2: Build AI prompt
const prompt = `Generate a medical exam question testing:
**Fact**: ${knowledgePoint.fact}
**Lesson**: ${knowledgePoint.lesson.name}
**Topic**: ${knowledgePoint.topic?.name || 'N/A'}

Requirements:
- 5 options (A-E)
- Clinical scenario format
- Plausible distractors
- Detailed explanation`;

// Step 3: Generate question via AI
const rawResponse = await aiRouter.runTask(AITaskType.QUESTION_GENERATION, { prompt });

// Step 4: Similarity check (prevent duplicates)
const embedding = await aiRouter.runTask(AITaskType.EMBEDDING, { text: rawResponse.question });

const existingQuestions = await prisma.questionCard.findMany({
  where: { lessonId: knowledgePoint.lessonId },
  select: { id: true, questionEmbedding: true }
});

let maxSimilarity = 0;
const similarQuestionIds = [];
for (const existing of existingQuestions) {
  const similarity = cosineSimilarity(embedding, existing.questionEmbedding);
  if (similarity > 0.8) {
    similarQuestionIds.push(existing.id);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
}

// Step 5: Regenerate if too similar (max 5 attempts)
if (maxSimilarity > 0.8) {
  // Retry with different prompt...
}

// Step 6: Create QuestionCard
const questionCard = await prisma.questionCard.create({
  data: {
    sourceType: 'AI_GENERATION',
    question: rawResponse.question,
    options: rawResponse.options,
    correctAnswer: rawResponse.correctAnswer,
    explanation: rawResponse.explanation,
    difficulty: rawResponse.difficulty || 'MEDIUM',
    similarityChecked: true,
    similarQuestionIds,
    questionEmbedding: embedding,
    approvalStatus: 'PENDING',  // Requires admin review
    lessonId: knowledgePoint.lessonId,
    topicId: knowledgePoint.topicId,
    subtopicId: knowledgePoint.subtopicId,
  }
});

// Step 7: Link KnowledgePoint
await prisma.questionKnowledgePoint.create({
  data: {
    questionCardId: questionCard.id,
    knowledgePointId: knowledgePoint.id,
    relationshipType: 'MEASURED'
  }
});
```

**Key Points**:
- **Starts as PENDING**: Must be reviewed by admin
- **Similarity check**: Prevents near-duplicate questions
- **Embedding storage**: Enables future similarity checks
- **Max 5 regeneration attempts**: Balance quality vs. performance

---

### 3. ERROR_BASED Source

**Purpose**: Generate targeted remediation questions from user mistakes.

**Trigger**: Manual (admin) or automated (scheduled job analyzing UserWeakness).

**Flow**:

```typescript
// Step 1: Find weak knowledge points for user
const weaknesses = await prisma.userWeakness.findMany({
  where: {
    userId,
    weaknessScore: { gte: 0.7 },  // 70%+ incorrect rate
    totalAttempts: { gte: 3 }     // Statistical significance
  },
  include: { knowledgePoint: true },
  orderBy: { weaknessScore: 'desc' },
  take: 5  // Limit per generation batch
});

// Step 2: For each weakness, fetch recent mistakes context
for (const weakness of weaknesses) {
  const recentMistakes = await prisma.userAnswer.findMany({
    where: {
      userId,
      isCorrect: false,
      questionCard: {
        questionKnowledgePoints: {
          some: { knowledgePointId: weakness.knowledgePointId }
        }
      }
    },
    include: { questionCard: true },
    orderBy: { answeredAt: 'desc' },
    take: 3
  });

  // Step 3: Build enhanced prompt with mistake patterns
  const mistakeContext = recentMistakes.length > 0
    ? `Student has made ${recentMistakes.length} recent mistakes on this concept. 
       Generate a question that reinforces the correct reasoning.`
    : '';

  const prompt = `Generate an ERROR_BASED remediation question:

**Weak Knowledge Point**: ${weakness.knowledgePoint.fact}
**Weakness Score**: ${weakness.weaknessScore.toFixed(2)} 
  (${weakness.incorrectCount} incorrect / ${weakness.totalAttempts} total)

${mistakeContext}

**Requirements**:
- NEW scenario (not a duplicate)
- CLEARLY dependent on understanding the knowledge point
- Educational and clear (this is remediation)
- Difficulty: MEDIUM
- 5 options with detailed explanation`;

  // Step 4: Generate with similarity check
  const rawResponse = await aiRouter.runTask(AITaskType.QUESTION_GENERATION, { prompt });
  const embedding = await aiRouter.runTask(AITaskType.EMBEDDING, { text: rawResponse.question });
  
  // Similarity check (same as AI_GENERATION)...

  // Step 5: Create ERROR_BASED QuestionCard
  const questionCard = await prisma.questionCard.create({
    data: {
      sourceType: 'ERROR_BASED',
      question: rawResponse.question,
      options: rawResponse.options,
      correctAnswer: rawResponse.correctAnswer,
      explanation: rawResponse.explanation,
      mainExplanation: `Remediation for: ${weakness.knowledgePoint.fact}`,
      difficulty: 'MEDIUM',  // Fixed difficulty for remediation
      similarityChecked: true,
      similarQuestionIds,
      questionEmbedding: embedding,
      approvalStatus: 'PENDING',  // Requires admin review
      lessonId: weakness.knowledgePoint.lessonId,
      topicId: weakness.knowledgePoint.topicId,
      subtopicId: weakness.knowledgePoint.subtopicId,
    }
  });

  // Step 6: Link KnowledgePoint
  await prisma.questionKnowledgePoint.create({
    data: {
      questionCardId: questionCard.id,
      knowledgePointId: weakness.knowledgePointId,
      relationshipType: 'MEASURED'
    }
  });
}
```

**Key Points**:
- **Weakness threshold**: Only generates for weaknessScore ≥ 0.7
- **Minimum attempts**: Requires 3+ attempts for statistical validity
- **Mistake context**: Uses recent wrong answers to inform generation
- **Fixed MEDIUM difficulty**: Remediation should be challenging but solvable
- **PENDING approval**: Safety gate before exposing to students

---

## Spatial Context Handling

**Purpose**: Enable anatomy-spatial intelligence for topographic reasoning.

### What is Spatial Context?

Spatial context links QuestionCards to **anatomy concepts** (e.g., "Left ventricle", "Femoral artery"). This enables:
- **Regional weakness analysis**: "User struggles with anterior chest anatomy"
- **Prerequisite-spatial correlations**: "Coronary anatomy prerequisite → 15 questions about LAD territory"
- **Future question prediction**: "Exam likely to test spatially adjacent structures"

### Creation Flow

```typescript
// From ExamQuestion.analysisPayload.spatialContext
const payload = examQuestion.analysisPayload;
// payload.spatialContext = ["Left ventricle", "Mitral valve", "Left atrium"]  (max 3)

for (const spatialLabel of payload.spatialContext) {
  // Step 1: Resolve label → Concept ID
  const normalized = spatialLabel.toLowerCase().trim();
  
  const concept = await prisma.concept.findFirst({
    where: {
      OR: [
        { normalizedLabel: normalized },
        { aliases: { some: { normalizedAlias: normalized, isActive: true }}}
      ]
    }
  });

  if (!concept) {
    logger.warn(`Spatial context "${spatialLabel}" not found in Concept registry`);
    continue;
  }

  // Step 2: Create GeneratedQuestionSpatialContext link
  await prisma.generatedQuestionSpatialContext.create({
    data: {
      questionCardId: questionCard.id,
      conceptId: concept.id
    }
  });
}
```

### Why Max 3 Spatial Contexts?

**Design Rule**: Limit to 3 most relevant anatomical structures to:
- Maintain signal quality (avoid dilution)
- Ensure human-reviewable precision
- Prevent combinatorial explosion in analytics

### Usage Example

**Query**: "Find all questions testing 'Left anterior descending artery'"

```typescript
const questions = await prisma.questionCard.findMany({
  where: {
    spatialContexts: {
      some: {
        concept: { normalizedLabel: 'left anterior descending artery' }
      }
    }
  }
});
```

---

## Knowledge Point Linking

**Purpose**: Connect QuestionCards to KnowledgePoints for teaching continuity.

### Relationship Types

```prisma
enum RelationshipType {
  MEASURED  // Question directly tests this knowledge
  TRAP      // Knowledge used as distractor
  CONTEXT   // Provides background context
}
```

### Creation Logic

```typescript
// Primary knowledge (spotRule from exam analysis)
await prisma.questionKnowledgePoint.create({
  data: {
    questionCardId: questionCard.id,
    knowledgePointId: primaryKnowledgePoint.id,
    relationshipType: 'MEASURED'
  }
});

// Distractor knowledge (from wrong options)
for (const distractor of payload.optionAnalysis.filter(o => !o.isCorrect)) {
  const trapKnowledge = await findOrCreateKnowledgePoint(distractor.wouldBeCorrectIf);
  
  await prisma.questionKnowledgePoint.create({
    data: {
      questionCardId: questionCard.id,
      knowledgePointId: trapKnowledge.id,
      relationshipType: 'TRAP'
    }
  });
}
```

### Why Link KnowledgePoints?

1. **Measure vs. Teach**: QuestionCard measures, KnowledgePoint teaches
2. **Weakness tracking**: When user gets question wrong → increment UserWeakness for linked KnowledgePoints
3. **Adaptive generation**: Generate new questions from weak KnowledgePoints
4. **Flashcard connection**: Same KnowledgePoint can power both QuestionCards and Flashcards

---

## Admin Review Flow

**Status Flow**:
```
PENDING → APPROVED (admin approves)
        → REJECTED (admin rejects)
        → DELETED (soft delete)
```

### Admin Actions

#### 1. List PENDING Questions

```typescript
GET /admin/generated-questions?approvalStatus=PENDING&lessonId={lessonId}

Response:
{
  questions: [
    {
      id: "...",
      question: "A 55-year-old male presents with...",
      options: { A: "...", B: "...", ... },
      correctAnswer: "B",
      difficulty: "MEDIUM",
      sourceType: "AI_GENERATION",
      lesson: { name: "Cardiology" },
      createdAt: "2026-01-20T10:30:00Z"
    }
  ],
  statusCounts: { PENDING: 45, APPROVED: 230, REJECTED: 12 }
}
```

#### 2. Review Single Question

```typescript
GET /admin/generated-questions/{id}

Response:
{
  id: "...",
  question: "...",
  options: { A: "...", B: "...", ... },
  correctAnswer: "B",
  explanation: "...",
  optionsMetadata: {
    A: { text: "Anterior MI", wouldBeCorrectIf: "ST elevation in V1-V4", isCorrect: false },
    B: { text: "Inferior MI", wouldBeCorrectIf: "Always correct", isCorrect: true }
  },
  mainExplanation: "Inferior MI shows ST elevation in II, III, aVF",
  questionKnowledgePoints: [
    { knowledgePoint: { fact: "..." }, relationshipType: "MEASURED" }
  ],
  spatialContexts: [
    { concept: { label: "Right coronary artery" } }
  ],
  similarQuestionIds: ["uuid1", "uuid2"]  // Similar questions found
}
```

#### 3. Approve Question

```typescript
POST /admin/generated-questions/{id}/approve
Body: { approvedBy: "admin-user-id" }

Effect:
- approvalStatus → APPROVED
- approvedAt → current timestamp
- Question becomes visible to students
- AdminAuditLog entry created
```

#### 4. Reject Question

```typescript
POST /admin/generated-questions/{id}/reject
Body: { rejectedBy: "admin-user-id", reason: "Too ambiguous" }

Effect:
- approvalStatus → REJECTED
- Question hidden from students
- Reason logged for analysis
```

#### 5. Edit Question

```typescript
PATCH /admin/generated-questions/{id}
Body: {
  question: "Updated question text...",
  explanation: "Updated explanation...",
  correctAnswer: "C"  // If correction needed
}

Effect:
- Updates question content
- Status remains unchanged
- AdminAuditLog entry created
```

#### 6. Delete Question

```typescript
DELETE /admin/generated-questions/{id}

Effect:
- approvalStatus → DELETED (soft delete)
- Question hidden from all interfaces
- Historical data preserved
```

---

## Student Solve Flow

### 1. Fetch APPROVED Questions

```typescript
GET /api/student/questions?lessonId={lessonId}&difficulty=MEDIUM&limit=20

Response:
{
  questions: [
    {
      id: "...",
      question: "A 55-year-old male presents with...",
      options: { A: "...", B: "...", C: "...", D: "...", E: "..." },
      // correctAnswer: HIDDEN
      difficulty: "MEDIUM",
      sourceType: "AI_GENERATION",
      patternType: "Clinical Reasoning",
      clinicalCorrelation: "...",
      timesShown: 45,
      correctRate: 0.67,
      lesson: { name: "Cardiology" }
    }
  ],
  pagination: { total: 150, limit: 20, offset: 0, hasMore: true }
}
```

**Critical**: `correctAnswer` is **not returned** until student submits.

### 2. Submit Answer

```typescript
POST /api/student/questions/{id}/answer
Body: {
  userId: "user-uuid",
  selectedAnswer: "B",
  timeSpent: 120  // seconds
}

Response:
{
  userAnswerId: "...",
  isCorrect: true,
  correctAnswer: "B",
  selectedAnswer: "B",
  explanation: "Inferior MI shows ST elevation in leads II, III, aVF...",
  optionsMetadata: {
    A: { text: "Anterior MI", wouldBeCorrectIf: "ST elevation in V1-V4", isCorrect: false },
    B: { text: "Inferior MI", isCorrect: true }
  },
  timesShown: 46,
  correctRate: 0.68,
  affectedKnowledgePoints: ["kp-uuid-1"],
  knowledgePoints: [
    { id: "kp-uuid-1", fact: "Inferior MI: ST elevation II, III, aVF", relationshipType: "MEASURED" }
  ]
}
```

### 3. Backend Processing

```typescript
async function submitAnswer({ userId, questionId, selectedAnswer, timeSpent }) {
  return prisma.$transaction(async (tx) => {
    // Step 1: Fetch question
    const question = await tx.questionCard.findUnique({
      where: { id: questionId },
      include: { questionKnowledgePoints: { include: { knowledgePoint: true } } }
    });

    if (question.approvalStatus !== 'APPROVED') {
      throw new Error('Question not available');
    }

    const isCorrect = selectedAnswer === question.correctAnswer;

    // Step 2: Create UserAnswer
    await tx.userAnswer.create({
      data: { userId, questionCardId: questionId, selectedAnswer, isCorrect, timeSpent }
    });

    // Step 3: Update QuestionCard stats
    const timesShown = question.timesShown + 1;
    const totalCorrect = (question.correctRate || 0) * question.timesShown + (isCorrect ? 1 : 0);
    const newCorrectRate = totalCorrect / timesShown;

    await tx.questionCard.update({
      where: { id: questionId },
      data: { timesShown, correctRate: newCorrectRate }
    });

    // Step 4: Update UserWeakness
    const affectedKnowledgePoints = [];

    for (const qkp of question.questionKnowledgePoints) {
      if (qkp.relationshipType !== 'MEASURED') continue;

      const knowledgePointId = qkp.knowledgePointId;
      affectedKnowledgePoints.push(knowledgePointId);

      const weakness = await tx.userWeakness.findUnique({
        where: { userId_knowledgePointId: { userId, knowledgePointId } }
      });

      if (weakness) {
        // Update existing weakness
        const incorrectCount = weakness.incorrectCount + (isCorrect ? 0 : 1);
        const totalAttempts = weakness.totalAttempts + 1;
        const weaknessScore = incorrectCount / totalAttempts;

        await tx.userWeakness.update({
          where: { userId_knowledgePointId: { userId, knowledgePointId } },
          data: {
            incorrectCount,
            totalAttempts,
            weaknessScore,
            ...(isCorrect ? {} : { lastIncorrectAt: new Date() })
          }
        });
      } else if (!isCorrect) {
        // Create new weakness (only if incorrect)
        await tx.userWeakness.create({
          data: {
            userId,
            knowledgePointId,
            incorrectCount: 1,
            totalAttempts: 1,
            weaknessScore: 1.0,
            lastIncorrectAt: new Date()
          }
        });
      }
    }

    // Step 5: Return feedback
    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      affectedKnowledgePoints,
      ...
    };
  });
}
```

### Key Analytics Updates

| Event | QuestionCard | UserWeakness |
|-------|--------------|--------------|
| **Correct answer** | `timesShown++`, `correctRate` recalculated | `totalAttempts++`, `weaknessScore` decreases |
| **Incorrect answer** | `timesShown++`, `correctRate` recalculated | `incorrectCount++`, `totalAttempts++`, `weaknessScore` increases, `lastIncorrectAt` updated |

---

## Analytics & Intelligence

### 1. QuestionCard Performance Stats

```typescript
// QuestionCard.timesShown: Usage count
// QuestionCard.correctRate: Success percentage

// Example: Find hardest questions
const hardQuestions = await prisma.questionCard.findMany({
  where: {
    timesShown: { gte: 50 },
    correctRate: { lt: 0.4 }
  },
  orderBy: { correctRate: 'asc' }
});
```

### 2. Spatial Anatomy Analytics

**Query**: Performance by anatomy region

```typescript
GET /admin/analytics/spatial-anatomy?lessonId=cardiology&minAttempts=20

Response:
{
  concepts: [
    {
      conceptId: "...",
      conceptLabel: "Right coronary artery",
      questionsCount: 12,
      totalAttempts: 540,
      avgCorrectRate: 0.58,  // Weakness!
      difficultyDistribution: { EASY: 3, MEDIUM: 7, HARD: 2 },
      lessonDistribution: { Cardiology: 10, Emergency: 2 }
    },
    {
      conceptLabel: "Left anterior descending artery",
      avgCorrectRate: 0.75  // Stronger
    }
  ],
  summary: {
    totalConcepts: 45,
    weakestConcept: { label: "Right coronary artery", correctRate: 0.58 },
    strongestConcept: { label: "Aortic arch", correctRate: 0.82 }
  }
}
```

**Usage**:
- Identify weak anatomy regions across all users
- Prioritize content creation for weak regions
- Prerequisite dependency analysis

### 3. User Spatial Weaknesses

**Query**: Anatomy regions where a user struggles

```typescript
GET /admin/analytics/spatial-weaknesses/{userId}?limit=10

Response:
[
  {
    knowledgePointId: "...",
    fact: "RCA occlusion causes inferior MI",
    weaknessScore: 0.75,  // 75% incorrect
    incorrectCount: 6,
    totalAttempts: 8,
    spatialConcepts: ["Right coronary artery", "Inferior wall", "RCA territory"]
  }
]
```

**Usage**:
- Personalized study plans: "Focus on RCA anatomy"
- Trigger ERROR_BASED generation for spatial regions
- Adaptive question sequencing

### 4. Prerequisite-Spatial Correlations

**Query**: Which anatomy regions require which prerequisites?

```typescript
GET /admin/analytics/prerequisite-spatial?lessonId=cardiology

Response:
[
  {
    prerequisiteId: "...",
    prerequisiteName: "Coronary Artery Anatomy",
    spatialConcepts: [
      { label: "Left anterior descending artery", questionCount: 18 },
      { label: "Right coronary artery", questionCount: 15 },
      { label: "Circumflex artery", questionCount: 12 }
    ],
    totalQuestions: 45
  }
]
```

**Usage**:
- Prerequisite blocking: Block questions until prerequisite mastered
- Study path optimization: "Master coronary anatomy before ECG interpretation"
- Content gap detection: "No questions linking prerequisite X to region Y"

### 5. Adaptive Question Sequencing

**Future Enhancement**: Use analytics to sequence questions intelligently.

```typescript
// Pseudocode
function getNextQuestion(userId, lessonId) {
  // 1. Fetch user weaknesses
  const weaknesses = getUserWeaknesses(userId, threshold=0.6);
  
  // 2. If weaknesses exist, prioritize remediation
  if (weaknesses.length > 0) {
    return getQuestionForKnowledgePoint(weaknesses[0].knowledgePointId);
  }
  
  // 3. Otherwise, fetch questions for weak spatial regions
  const spatialWeaknesses = getUserSpatialWeaknesses(userId);
  if (spatialWeaknesses.length > 0) {
    return getQuestionForSpatialConcept(spatialWeaknesses[0].spatialConcepts[0]);
  }
  
  // 4. Default: random APPROVED question
  return getRandomQuestion(lessonId);
}
```

---

## API Endpoints

### Student-Facing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/questions` | List APPROVED questions (paginated, filtered) |
| GET | `/api/student/questions/:id` | Get single question (without answer) |
| POST | `/api/student/questions/:id/answer` | Submit answer, get feedback |
| GET | `/api/student/questions/:id/history` | User's answer history for question |
| GET | `/api/student/questions/weaknesses/analysis` | User's weak knowledge points |

### Admin-Facing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/generated-questions` | List questions (all statuses, filterable) |
| GET | `/admin/generated-questions/:id` | Get question details |
| POST | `/admin/generated-questions/:id/approve` | Approve question |
| POST | `/admin/generated-questions/:id/reject` | Reject question |
| PATCH | `/admin/generated-questions/:id` | Edit question |
| DELETE | `/admin/generated-questions/:id` | Soft delete question |
| GET | `/admin/analytics/spatial-anatomy` | Spatial anatomy performance |
| GET | `/admin/analytics/spatial-weaknesses/:userId` | User spatial weaknesses |
| GET | `/admin/analytics/prerequisite-spatial` | Prerequisite-spatial correlations |

### Generation Triggers

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/question-generation/from-knowledge-point` | Generate AI_GENERATION question |
| POST | `/admin/question-generation/from-exam-question` | Generate EXAM_REPLICA question |
| POST | `/admin/question-generation/from-user-weakness` | Generate ERROR_BASED questions |

---

## Design Principles

### 1. QuestionCard = Measurement, Not Teaching

**Rule**: QuestionCard measures student knowledge. KnowledgePoint teaches it.

**Why**: Clear separation of concerns. Students "learn" from Flashcards (KnowledgePoint), then "prove" mastery with QuestionCards.

### 2. Approval as Safety Gate

**Rule**: Only APPROVED questions are visible to students.

**Why**: Prevents AI-generated garbage from reaching users. Human review ensures quality.

**Exception**: EXAM_REPLICA questions auto-approve (trusted source).

### 3. Spatial Context = Anatomy Intelligence

**Rule**: Always extract and link spatial contexts for anatomy questions.

**Why**: Enables:
- Regional weakness analysis
- Prerequisite-spatial correlations
- Future exam prediction (spatial adjacency patterns)

**Limit**: Max 3 spatial contexts per question (signal quality).

### 4. UserWeakness = Adaptive Trigger

**Rule**: Track weaknesses at KnowledgePoint level, not QuestionCard level.

**Why**: Enables remediation across all question types. One weak KnowledgePoint → generate ERROR_BASED, adjust difficulty, recommend Flashcards.

### 5. Similarity Check = Quality Control

**Rule**: Always check similarity before saving AI-generated questions.

**Why**: Prevents near-duplicate questions. Max 5 regeneration attempts balances quality vs. performance.

**Threshold**: Cosine similarity > 0.8 = too similar.

### 6. Difficulty Calibration

**Rule**: Difficulty derived from source confidence or analysis.

**Mapping**:
- `patternConfidence > 0.85` → EASY
- `patternConfidence > 0.6` → MEDIUM
- `patternConfidence ≤ 0.6` → HARD
- ERROR_BASED → Always MEDIUM

**Future**: Adaptive recalibration based on `correctRate` after N attempts.

### 7. Analytics = Aggregate Only

**Rule**: Never expose individual user data without aggregation (GDPR/privacy).

**Example**: Show "User struggles with RCA anatomy" (aggregated weaknesses), not "User got Question #123 wrong 3 times" (raw data).

### 8. No Ontology Auto-Creation

**Rule**: Never auto-create Topics, Subtopics, or Lessons.

**Why**: Ontology is curated by domain experts. QuestionCard creation only **links** to existing ontology.

**Exception**: KnowledgePoint creation from spotRule (domain-specific knowledge, not structure).

### 9. Audit Everything

**Rule**: All admin actions (approve, reject, edit, delete) logged to AdminAuditLog.

**Why**: Accountability, analytics, debugging, compliance.

### 10. Idempotent Operations

**Rule**: All question generation is idempotent (same input → same output, or cached).

**Why**: Prevents duplicate questions. Similarity check enforces this.

---

## Future Enhancements

### 1. Difficulty Recalibration
- After 50+ attempts, recalibrate difficulty based on actual `correctRate`
- Item Response Theory (IRT) integration

### 2. Batch Operations
- Bulk approve/reject (e.g., "Approve all AI_GENERATION from GPT-4 with similarity < 0.5")
- Bulk regenerate (e.g., "Regenerate all REJECTED ERROR_BASED questions")

### 3. Question Versioning
- Track edit history
- A/B testing variants

### 4. Automated ERROR_BASED Triggers
- Scheduled job: Analyze all users, generate ERROR_BASED for weaknesses > 0.7
- Notification system: "New remediation questions available"

### 5. Advanced Spatial Intelligence
- Spatial adjacency graphs (e.g., "If weak on LAD, likely weak on LCx")
- Predictive modeling: "Exam 2026 likely to test X based on spatial patterns"

### 6. Prerequisite Auto-Linking
- Use AI to suggest prerequisites for questions
- Validate prerequisite dependencies

---

## Summary

**QuestionCard Lifecycle**:
1. **Creation**: EXAM_REPLICA (auto-approved) | AI_GENERATION (pending) | ERROR_BASED (pending)
2. **Spatial Linking**: Extract anatomy concepts → GeneratedQuestionSpatialContext
3. **Knowledge Linking**: Map spotRule → KnowledgePoint → QuestionKnowledgePoint
4. **Admin Review**: Approve/Reject/Edit/Delete
5. **Student Solve**: Fetch APPROVED → Submit answer → Update stats
6. **Analytics**: UserWeakness → ERROR_BASED generation → Cycle continues

**Intelligence Flow**:
```
ExamQuestion → Analysis → EXAM_REPLICA QuestionCard → Student solves → UserWeakness detected
    ↓                                                                        ↓
KnowledgePoint → AI_GENERATION QuestionCard                    ERROR_BASED QuestionCard
    ↓                                                                        ↓
Flashcard (teaching)                                          Targeted remediation
```

**Result**: A **deterministic, auditable, intelligent** question lifecycle that measures knowledge, detects weaknesses, and enables adaptive learning.

---

**End of QuestionCard Lifecycle Documentation**
