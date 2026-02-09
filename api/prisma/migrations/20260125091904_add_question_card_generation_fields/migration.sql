/*
  Warnings:

  - Added the required column `lessonId` to the `GeneratedQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SolveRole" AS ENUM ('STUDENT', 'ADMIN');

-- AlterTable
ALTER TABLE "GeneratedQuestion" ADD COLUMN     "difficulty" "Difficulty",
ADD COLUMN     "lessonId" TEXT NOT NULL,
ADD COLUMN     "mainExplanation" TEXT,
ADD COLUMN     "optionsMetadata" JSONB,
ADD COLUMN     "prerequisiteId" TEXT,
ADD COLUMN     "sourceExamQuestionId" TEXT,
ADD COLUMN     "subtopicId" TEXT,
ADD COLUMN     "topicId" TEXT;

-- CreateTable
CREATE TABLE "SolvedQuestionCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedQuestionId" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "attempt" INTEGER NOT NULL,
    "roleAtSolve" "SolveRole" NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolvedQuestionCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedQuestion_difficulty_idx" ON "GeneratedQuestion"("difficulty");

-- CreateIndex
CREATE INDEX "GeneratedQuestion_sourceExamQuestionId_idx" ON "GeneratedQuestion"("sourceExamQuestionId");

-- AddForeignKey
ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "PrerequisiteNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedQuestion" ADD CONSTRAINT "GeneratedQuestion_sourceExamQuestionId_fkey" FOREIGN KEY ("sourceExamQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
