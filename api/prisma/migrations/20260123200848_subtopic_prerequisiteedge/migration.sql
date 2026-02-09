/*
  Warnings:

  - You are about to drop the column `subtopic` on the `PrerequisiteTopicEdge` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PrerequisiteTopicEdge_subtopic_idx";

-- AlterTable
ALTER TABLE "PrerequisiteTopicEdge" DROP COLUMN "subtopic",
ADD COLUMN     "subtopicId" TEXT;

-- CreateIndex
CREATE INDEX "PrerequisiteTopicEdge_subtopicId_idx" ON "PrerequisiteTopicEdge"("subtopicId");

-- AddForeignKey
ALTER TABLE "PrerequisiteTopicEdge" ADD CONSTRAINT "PrerequisiteTopicEdge_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
