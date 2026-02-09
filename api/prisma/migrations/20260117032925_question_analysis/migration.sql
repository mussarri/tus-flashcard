/*
  Warnings:

  - Changed the type of `traps` on the `ExamQuestion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ExamQuestion" DROP COLUMN "traps",
ADD COLUMN     "traps" JSONB NOT NULL;
