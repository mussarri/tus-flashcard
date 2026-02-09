/*
  Warnings:

  - Added the required column `contentType` to the `ParsedBlock` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TOPIC_EXPLANATION', 'SPOT_FACT', 'QUESTION_ONLY', 'QUESTION_WITH_ANSWER', 'EXPLANATION_ONLY', 'MIXED_CONTENT');

-- AlterEnum
ALTER TYPE "BlockType" ADD VALUE 'SPOT';

-- AlterTable
ALTER TABLE "ParsedBlock" ADD COLUMN     "contentType" "ContentType" NOT NULL,
ADD COLUMN     "importantFacts" JSONB,
ADD COLUMN     "lesson" TEXT,
ADD COLUMN     "questions" JSONB,
ADD COLUMN     "subtopic" TEXT,
ADD COLUMN     "topic" TEXT,
ALTER COLUMN "blockType" DROP NOT NULL,
ALTER COLUMN "blockIndex" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ParsedBlock_contentType_idx" ON "ParsedBlock"("contentType");

-- CreateIndex
CREATE INDEX "ParsedBlock_lesson_idx" ON "ParsedBlock"("lesson");

-- CreateIndex
CREATE INDEX "ParsedBlock_topic_idx" ON "ParsedBlock"("topic");
