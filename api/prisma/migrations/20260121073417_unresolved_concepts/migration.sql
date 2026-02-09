-- CreateEnum
CREATE TYPE "UnresolvedHintStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "UnresolvedConceptHint" (
    "id" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "questionId" TEXT,
    "lesson" TEXT NOT NULL,
    "topic" TEXT,
    "subtopic" TEXT,
    "source" TEXT NOT NULL DEFAULT 'QUESTION_ANALYSIS',
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" "UnresolvedHintStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnresolvedConceptHint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnresolvedConceptHint_status_idx" ON "UnresolvedConceptHint"("status");

-- CreateIndex
CREATE INDEX "UnresolvedConceptHint_lesson_idx" ON "UnresolvedConceptHint"("lesson");

-- CreateIndex
CREATE INDEX "UnresolvedConceptHint_count_idx" ON "UnresolvedConceptHint"("count");

-- CreateIndex
CREATE UNIQUE INDEX "UnresolvedConceptHint_hint_lesson_key" ON "UnresolvedConceptHint"("hint", "lesson");
