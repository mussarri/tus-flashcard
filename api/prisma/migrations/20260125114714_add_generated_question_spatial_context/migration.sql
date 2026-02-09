/*
  Warnings:

  - Made the column `lessonId` on table `ExamQuestion` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `source` to the `KnowledgePoint` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "KnowledgePointSource" AS ENUM ('APPROVED_CONTENT', 'EXAM_ANALYSIS', 'ADMIN');

-- AlterTable
ALTER TABLE "ExamQuestion" ALTER COLUMN "lessonId" SET NOT NULL;

-- AlterTable
ALTER TABLE "GeneratedQuestion" ADD COLUMN     "patternType" TEXT;

-- AlterTable
ALTER TABLE "KnowledgePoint" ADD COLUMN     "source" "KnowledgePointSource" NOT NULL;

-- CreateTable
CREATE TABLE "GeneratedQuestionSpatialContext" (
    "id" TEXT NOT NULL,
    "generatedQuestionId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedQuestionSpatialContext_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedQuestionSpatialContext_conceptId_idx" ON "GeneratedQuestionSpatialContext"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedQuestionSpatialContext_generatedQuestionId_concept_key" ON "GeneratedQuestionSpatialContext"("generatedQuestionId", "conceptId");

-- AddForeignKey
ALTER TABLE "GeneratedQuestionSpatialContext" ADD CONSTRAINT "GeneratedQuestionSpatialContext_generatedQuestionId_fkey" FOREIGN KEY ("generatedQuestionId") REFERENCES "GeneratedQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedQuestionSpatialContext" ADD CONSTRAINT "GeneratedQuestionSpatialContext_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
