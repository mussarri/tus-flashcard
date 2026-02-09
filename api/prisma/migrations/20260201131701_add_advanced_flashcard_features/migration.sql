/*
  Warnings:

  - A unique constraint covering the columns `[uniqueKey]` on the table `Flashcard` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CardType" ADD VALUE 'STRUCTURE_ID';
ALTER TYPE "CardType" ADD VALUE 'CONTENTS_OF_SPACE';
ALTER TYPE "CardType" ADD VALUE 'FUNCTIONAL_ANATOMY';
ALTER TYPE "CardType" ADD VALUE 'RELATIONS_BORDERS';
ALTER TYPE "CardType" ADD VALUE 'LESION_ANATOMY';
ALTER TYPE "CardType" ADD VALUE 'EMBRYOLOGIC_ORIGIN';
ALTER TYPE "CardType" ADD VALUE 'CLINICAL_CORRELATION';
ALTER TYPE "CardType" ADD VALUE 'HIGH_YIELD_DISTINCTION';
ALTER TYPE "CardType" ADD VALUE 'EXCEPT_TRAP';
ALTER TYPE "CardType" ADD VALUE 'TOPOGRAPHIC_MAP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConceptType" ADD VALUE 'FASCIA';
ALTER TYPE "ConceptType" ADD VALUE 'PLEXUS';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VisualStatus" ADD VALUE 'PENDING';
ALTER TYPE "VisualStatus" ADD VALUE 'AVAILABLE';

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "examPattern" TEXT,
ADD COLUMN     "examQuestionId" TEXT,
ADD COLUMN     "prerequisiteCardIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "trapData" JSONB,
ADD COLUMN     "uniqueKey" TEXT,
ALTER COLUMN "knowledgePointId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserFlashcardProgress" ADD COLUMN     "fellForTrap" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastResponse" TEXT,
ADD COLUMN     "trapLoopActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trapLoopCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PatternMastery" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "examPattern" TEXT NOT NULL,
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "cardsTotal" INTEGER NOT NULL DEFAULT 0,
    "cardsMastered" INTEGER NOT NULL DEFAULT 0,
    "needsBacktrack" BOOLEAN NOT NULL DEFAULT false,
    "prerequisitePatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "backtrackTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "PatternMastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatternMastery_userId_idx" ON "PatternMastery"("userId");

-- CreateIndex
CREATE INDEX "PatternMastery_examPattern_idx" ON "PatternMastery"("examPattern");

-- CreateIndex
CREATE INDEX "PatternMastery_needsBacktrack_idx" ON "PatternMastery"("needsBacktrack");

-- CreateIndex
CREATE UNIQUE INDEX "PatternMastery_userId_examPattern_key" ON "PatternMastery"("userId", "examPattern");

-- CreateIndex
CREATE UNIQUE INDEX "Flashcard_uniqueKey_key" ON "Flashcard"("uniqueKey");

-- CreateIndex
CREATE INDEX "Flashcard_examQuestionId_idx" ON "Flashcard"("examQuestionId");

-- CreateIndex
CREATE INDEX "Flashcard_examPattern_idx" ON "Flashcard"("examPattern");

-- CreateIndex
CREATE INDEX "UserFlashcardProgress_trapLoopActive_idx" ON "UserFlashcardProgress"("trapLoopActive");

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_examQuestionId_fkey" FOREIGN KEY ("examQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternMastery" ADD CONSTRAINT "PatternMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
