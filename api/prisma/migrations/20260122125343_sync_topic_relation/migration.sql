/*
  Warnings:

  - You are about to drop the column `subtopic` on the `ExamQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `ExamQuestion` table. All the data in the column will be lost.
  - Added the required column `topicId` to the `ExamQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ExamQuestion_lesson_topic_subtopic_idx";

-- AlterTable
ALTER TABLE "ExamQuestion" DROP COLUMN "subtopic",
DROP COLUMN "topic",
ADD COLUMN     "subtopicId" TEXT,
ADD COLUMN     "topicId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "subtopic" TEXT,
ADD COLUMN     "topic" TEXT;

-- CreateIndex
CREATE INDEX "ExamQuestion_topicId_subtopicId_idx" ON "ExamQuestion"("topicId", "subtopicId");

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
