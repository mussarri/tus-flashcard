/*
  Warnings:

  - You are about to drop the column `lesson` on the `Topic` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subtopic" DROP CONSTRAINT "Subtopic_lessonId_fkey";

-- DropIndex
DROP INDEX "Topic_lesson_idx";

-- DropIndex
DROP INDEX "Topic_name_lesson_key";

-- AlterTable
ALTER TABLE "Subtopic" ALTER COLUMN "lessonId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Topic" DROP COLUMN "lesson",
ADD COLUMN     "lessonId" TEXT;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtopic" ADD CONSTRAINT "Subtopic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
