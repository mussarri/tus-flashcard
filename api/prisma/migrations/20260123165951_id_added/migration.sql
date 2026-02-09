/*
  Warnings:

  - You are about to drop the column `lesson` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `subtopic` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `Flashcard` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `KnowledgePoint` table. All the data in the column will be lost.
  - You are about to drop the column `subcategory` on the `KnowledgePoint` table. All the data in the column will be lost.
  - You are about to drop the column `lesson` on the `ParsedBlock` table. All the data in the column will be lost.
  - You are about to drop the column `subtopic` on the `ParsedBlock` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `ParsedBlock` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Flashcard_lesson_idx";

-- DropIndex
DROP INDEX "KnowledgePoint_category_subcategory_idx";

-- DropIndex
DROP INDEX "ParsedBlock_lesson_idx";

-- DropIndex
DROP INDEX "ParsedBlock_topic_idx";

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "lesson",
DROP COLUMN "subtopic",
DROP COLUMN "topic",
ADD COLUMN     "lessonId" TEXT,
ADD COLUMN     "subtopicId" TEXT,
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "KnowledgePoint" DROP COLUMN "category",
DROP COLUMN "subcategory",
ADD COLUMN     "subtopicId" TEXT,
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "ParsedBlock" DROP COLUMN "lesson",
DROP COLUMN "subtopic",
DROP COLUMN "topic",
ADD COLUMN     "lessonId" TEXT,
ADD COLUMN     "subtopicId" TEXT,
ADD COLUMN     "topicId" TEXT;

-- AddForeignKey
ALTER TABLE "ParsedBlock" ADD CONSTRAINT "ParsedBlock_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedBlock" ADD CONSTRAINT "ParsedBlock_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedBlock" ADD CONSTRAINT "ParsedBlock_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
