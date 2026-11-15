ALTER TYPE "AITaskType" ADD VALUE IF NOT EXISTS 'TOPIC_EXPLANATION';

CREATE TYPE "TopicExplanationStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

CREATE TABLE "TopicExplanation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TopicExplanationStatus" NOT NULL DEFAULT 'DRAFT',
    "lessonId" TEXT,
    "topicId" TEXT,
    "knowledgePointId" TEXT,
    "originFlashcardId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TopicExplanation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Flashcard" ADD COLUMN "topicExplanationId" TEXT;

CREATE UNIQUE INDEX "TopicExplanation_originFlashcardId_key" ON "TopicExplanation"("originFlashcardId");
CREATE INDEX "TopicExplanation_knowledgePointId_lessonId_topicId_status_idx" ON "TopicExplanation"("knowledgePointId", "lessonId", "topicId", "status");
CREATE INDEX "TopicExplanation_status_createdAt_idx" ON "TopicExplanation"("status", "createdAt");
CREATE INDEX "Flashcard_topicExplanationId_idx" ON "Flashcard"("topicExplanationId");

ALTER TABLE "TopicExplanation" ADD CONSTRAINT "TopicExplanation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopicExplanation" ADD CONSTRAINT "TopicExplanation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TopicExplanation" ADD CONSTRAINT "TopicExplanation_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_topicExplanationId_fkey" FOREIGN KEY ("topicExplanationId") REFERENCES "TopicExplanation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

