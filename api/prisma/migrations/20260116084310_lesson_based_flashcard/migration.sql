/*
  Warnings:

  - The values [PENDING,PROCESSING,PARSED,REVIEWING] on the enum `BatchStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BatchStatus_new" AS ENUM ('UPLOADED', 'CLASSIFIED', 'REVIEWED', 'KNOWLEDGE_EXTRACTED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "UploadBatch" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UploadBatch" ALTER COLUMN "status" TYPE "BatchStatus_new" USING ("status"::text::"BatchStatus_new");
ALTER TYPE "BatchStatus" RENAME TO "BatchStatus_old";
ALTER TYPE "BatchStatus_new" RENAME TO "BatchStatus";
DROP TYPE "BatchStatus_old";
ALTER TABLE "UploadBatch" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';
COMMIT;

-- AlterEnum
ALTER TYPE "ExtractionStatus" ADD VALUE 'VERIFIED';

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "lesson" TEXT;

-- AlterTable
ALTER TABLE "KnowledgePoint" ADD COLUMN     "classificationConfidence" DOUBLE PRECISION,
ADD COLUMN     "sourceCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "UploadBatch" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';

-- CreateTable
CREATE TABLE "LessonFlashcardType" (
    "id" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonFlashcardType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionMode" TEXT,
    "provider" "AIProviderType",
    "batchId" TEXT,
    "approvedContentId" TEXT,
    "topicId" TEXT,
    "knowledgePointId" TEXT,
    "success" BOOLEAN NOT NULL,
    "resultCount" INTEGER,
    "skippedCount" INTEGER,
    "deletedCount" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonFlashcardType_lesson_idx" ON "LessonFlashcardType"("lesson");

-- CreateIndex
CREATE INDEX "LessonFlashcardType_cardType_idx" ON "LessonFlashcardType"("cardType");

-- CreateIndex
CREATE UNIQUE INDEX "LessonFlashcardType_lesson_cardType_key" ON "LessonFlashcardType"("lesson", "cardType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actionType_idx" ON "AdminAuditLog"("actionType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_batchId_idx" ON "AdminAuditLog"("batchId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_topicId_idx" ON "AdminAuditLog"("topicId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Flashcard_lesson_idx" ON "Flashcard"("lesson");
