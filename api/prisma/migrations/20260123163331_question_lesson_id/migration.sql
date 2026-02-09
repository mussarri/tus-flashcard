/*
  Warnings:

  - You are about to drop the column `lesson` on the `ExamQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ExamQuestion" DROP COLUMN "lesson",
ADD COLUMN     "lessonId" TEXT;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
