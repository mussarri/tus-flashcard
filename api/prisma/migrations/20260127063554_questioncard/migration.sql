/*
  Warnings:

  - You are about to drop the column `generatedQuestionId` on the `GeneratedQuestionSpatialContext` table. All the data in the column will be lost.
  - You are about to drop the column `generatedQuestionId` on the `QuestionKnowledgePoint` table. All the data in the column will be lost.
  - You are about to drop the column `generatedQuestionId` on the `UserAnswer` table. All the data in the column will be lost.
  - You are about to drop the `GeneratedQuestion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[questionCardId,conceptId]` on the table `GeneratedQuestionSpatialContext` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[questionCardId,knowledgePointId,relationshipType]` on the table `QuestionKnowledgePoint` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `questionCardId` to the `GeneratedQuestionSpatialContext` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionCardId` to the `UserAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionCardSource" AS ENUM ('ADMIN', 'AI_GENERATION');

-- DropForeignKey
ALTER TABLE "GeneratedQuestion" DROP CONSTRAINT "GeneratedQuestion_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedQuestion" DROP CONSTRAINT "GeneratedQuestion_prerequisiteId_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedQuestion" DROP CONSTRAINT "GeneratedQuestion_sourceExamQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedQuestion" DROP CONSTRAINT "GeneratedQuestion_subtopicId_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedQuestion" DROP CONSTRAINT "GeneratedQuestion_topicId_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedQuestionSpatialContext" DROP CONSTRAINT "GeneratedQuestionSpatialContext_generatedQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionKnowledgePoint" DROP CONSTRAINT "QuestionKnowledgePoint_generatedQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "UserAnswer" DROP CONSTRAINT "UserAnswer_generatedQuestionId_fkey";

-- DropIndex
DROP INDEX "GeneratedQuestionSpatialContext_generatedQuestionId_concept_key";

-- DropIndex
DROP INDEX "QuestionKnowledgePoint_generatedQuestionId_idx";

-- DropIndex
DROP INDEX "QuestionKnowledgePoint_generatedQuestionId_knowledgePointId_key";

-- DropIndex
DROP INDEX "UserAnswer_generatedQuestionId_idx";

-- AlterTable
ALTER TABLE "GeneratedQuestionSpatialContext" DROP COLUMN "generatedQuestionId",
ADD COLUMN     "questionCardId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuestionKnowledgePoint" DROP COLUMN "generatedQuestionId",
ADD COLUMN     "questionCardId" TEXT;

-- AlterTable
ALTER TABLE "UserAnswer" DROP COLUMN "generatedQuestionId",
ADD COLUMN     "questionCardId" TEXT NOT NULL;

-- DropTable
DROP TABLE "GeneratedQuestion";

-- DropEnum
DROP TYPE "GeneratedQuestionSource";

-- CreateTable
CREATE TABLE "QuestionCard" (
    "id" TEXT NOT NULL,
    "sourceType" "QuestionCardSource" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "patternType" TEXT,
    "prerequisiteId" TEXT,
    "clinicalCorrelation" TEXT,
    "topicId" TEXT,
    "subtopicId" TEXT,
    "lessonId" TEXT NOT NULL,
    "sourceExamQuestionId" TEXT,
    "difficulty" "Difficulty",
    "scenarioType" TEXT,
    "optionsMetadata" JSONB,
    "mainExplanation" TEXT,
    "similarityChecked" BOOLEAN NOT NULL DEFAULT false,
    "similarQuestionIds" TEXT[],
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "timesShown" INTEGER NOT NULL DEFAULT 0,
    "correctRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionCard_approvalStatus_idx" ON "QuestionCard"("approvalStatus");

-- CreateIndex
CREATE INDEX "QuestionCard_scenarioType_idx" ON "QuestionCard"("scenarioType");

-- CreateIndex
CREATE INDEX "QuestionCard_difficulty_idx" ON "QuestionCard"("difficulty");

-- CreateIndex
CREATE INDEX "QuestionCard_sourceExamQuestionId_idx" ON "QuestionCard"("sourceExamQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedQuestionSpatialContext_questionCardId_conceptId_key" ON "GeneratedQuestionSpatialContext"("questionCardId", "conceptId");

-- CreateIndex
CREATE INDEX "QuestionKnowledgePoint_questionCardId_idx" ON "QuestionKnowledgePoint"("questionCardId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionKnowledgePoint_questionCardId_knowledgePointId_rela_key" ON "QuestionKnowledgePoint"("questionCardId", "knowledgePointId", "relationshipType");

-- CreateIndex
CREATE INDEX "UserAnswer_questionCardId_idx" ON "UserAnswer"("questionCardId");

-- AddForeignKey
ALTER TABLE "GeneratedQuestionSpatialContext" ADD CONSTRAINT "GeneratedQuestionSpatialContext_questionCardId_fkey" FOREIGN KEY ("questionCardId") REFERENCES "QuestionCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCard" ADD CONSTRAINT "QuestionCard_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "PrerequisiteNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCard" ADD CONSTRAINT "QuestionCard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCard" ADD CONSTRAINT "QuestionCard_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCard" ADD CONSTRAINT "QuestionCard_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCard" ADD CONSTRAINT "QuestionCard_sourceExamQuestionId_fkey" FOREIGN KEY ("sourceExamQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionKnowledgePoint" ADD CONSTRAINT "QuestionKnowledgePoint_questionCardId_fkey" FOREIGN KEY ("questionCardId") REFERENCES "QuestionCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_questionCardId_fkey" FOREIGN KEY ("questionCardId") REFERENCES "QuestionCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
