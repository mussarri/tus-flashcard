-- CreateEnum
CREATE TYPE "ConceptType" AS ENUM ('NERVE', 'MUSCLE', 'VESSEL', 'STRUCTURE', 'ORGAN', 'BONE', 'JOINT', 'LIGAMENT', 'SPACE', 'FORAMEN');

-- CreateEnum
CREATE TYPE "ConceptStatus" AS ENUM ('ACTIVE', 'NEEDS_REVIEW', 'MERGED');

-- CreateEnum
CREATE TYPE "AliasLanguage" AS ENUM ('TR', 'EN', 'LA');

-- CreateEnum
CREATE TYPE "AliasSource" AS ENUM ('AI', 'ADMIN', 'IMPORT');

-- AlterTable
ALTER TABLE "Concept" ADD COLUMN     "conceptType" "ConceptType" NOT NULL DEFAULT 'STRUCTURE',
ADD COLUMN     "mergedIntoId" TEXT,
ADD COLUMN     "status" "ConceptStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "ConceptAlias" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" "AliasLanguage" NOT NULL DEFAULT 'EN',
ADD COLUMN     "source" "AliasSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QuestionConcept" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionConcept_questionId_idx" ON "QuestionConcept"("questionId");

-- CreateIndex
CREATE INDEX "QuestionConcept_conceptId_idx" ON "QuestionConcept"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionConcept_questionId_conceptId_key" ON "QuestionConcept"("questionId", "conceptId");

-- CreateIndex
CREATE INDEX "Concept_status_idx" ON "Concept"("status");

-- CreateIndex
CREATE INDEX "Concept_conceptType_idx" ON "Concept"("conceptType");

-- CreateIndex
CREATE INDEX "ConceptAlias_isActive_idx" ON "ConceptAlias"("isActive");

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionConcept" ADD CONSTRAINT "QuestionConcept_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionConcept" ADD CONSTRAINT "QuestionConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
