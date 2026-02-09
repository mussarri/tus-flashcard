/*
  Warnings:

  - You are about to drop the column `patternConfidence` on the `ExamQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `patternType` on the `ExamQuestion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Topic` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ExamQuestion_patternType_idx";

-- AlterTable
ALTER TABLE "ExamQuestion" DROP COLUMN "patternConfidence",
DROP COLUMN "patternType";

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_key" ON "Topic"("name");
