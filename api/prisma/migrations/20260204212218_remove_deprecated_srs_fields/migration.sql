/*
  Warnings:

  - You are about to drop the column `easeFactor` on the `UserFlashcardProgress` table. All the data in the column will be lost.
  - You are about to drop the column `interval` on the `UserFlashcardProgress` table. All the data in the column will be lost.
  - You are about to drop the column `nextReview` on the `UserFlashcardProgress` table. All the data in the column will be lost.
  - You are about to drop the column `repetitions` on the `UserFlashcardProgress` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "UserFlashcardProgress_nextReview_idx";

-- AlterTable
ALTER TABLE "UserFlashcardProgress" DROP COLUMN "easeFactor",
DROP COLUMN "interval",
DROP COLUMN "nextReview",
DROP COLUMN "repetitions";
