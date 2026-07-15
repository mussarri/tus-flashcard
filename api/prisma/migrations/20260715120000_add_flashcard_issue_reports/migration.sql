-- CreateEnum
CREATE TYPE "FlashcardIssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "FlashcardIssueReport" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'NEEDS_EDIT',
    "note" TEXT,
    "status" "FlashcardIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardIssueReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardIssueReport_userId_flashcardId_key" ON "FlashcardIssueReport"("userId", "flashcardId");

-- CreateIndex
CREATE INDEX "FlashcardIssueReport_flashcardId_idx" ON "FlashcardIssueReport"("flashcardId");

-- CreateIndex
CREATE INDEX "FlashcardIssueReport_status_idx" ON "FlashcardIssueReport"("status");

-- CreateIndex
CREATE INDEX "FlashcardIssueReport_createdAt_idx" ON "FlashcardIssueReport"("createdAt");

-- AddForeignKey
ALTER TABLE "FlashcardIssueReport" ADD CONSTRAINT "FlashcardIssueReport_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
