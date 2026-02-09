/*
  Warnings:

  - You are about to drop the `PrerequisiteSubtopicEdge` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PrerequisiteSubtopicEdge" DROP CONSTRAINT "PrerequisiteSubtopicEdge_prerequisiteId_fkey";

-- DropForeignKey
ALTER TABLE "PrerequisiteSubtopicEdge" DROP CONSTRAINT "PrerequisiteSubtopicEdge_subtopicId_fkey";

-- AlterTable
ALTER TABLE "PrerequisiteTopicEdge" ADD COLUMN     "subtopic" TEXT;

-- DropTable
DROP TABLE "PrerequisiteSubtopicEdge";

-- CreateIndex
CREATE INDEX "PrerequisiteTopicEdge_subtopic_idx" ON "PrerequisiteTopicEdge"("subtopic");
