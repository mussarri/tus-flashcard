/*
  Warnings:

  - You are about to drop the column `lesson` on the `Subtopic` table. All the data in the column will be lost.
  - You are about to drop the column `topicName` on the `Subtopic` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,topicId]` on the table `Subtopic` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lessonId` to the `Subtopic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topicId` to the `Subtopic` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Subtopic_lesson_idx";

-- DropIndex
DROP INDEX "Subtopic_name_topicName_lesson_key";

-- DropIndex
DROP INDEX "Subtopic_questionCount_idx";

-- DropIndex
DROP INDEX "Subtopic_topicName_idx";

-- AlterTable
ALTER TABLE "Concept" ADD COLUMN     "subtopicId" TEXT;

-- AlterTable
ALTER TABLE "Subtopic" DROP COLUMN "lesson",
DROP COLUMN "topicName",
ADD COLUMN     "lessonId" TEXT NOT NULL,
ADD COLUMN     "topicId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Subtopic_topicId_idx" ON "Subtopic"("topicId");

-- CreateIndex
CREATE INDEX "Subtopic_lessonId_idx" ON "Subtopic"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Subtopic_name_topicId_key" ON "Subtopic"("name", "topicId");

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtopic" ADD CONSTRAINT "Subtopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtopic" ADD CONSTRAINT "Subtopic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
