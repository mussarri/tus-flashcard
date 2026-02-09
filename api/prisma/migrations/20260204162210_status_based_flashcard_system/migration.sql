-- CreateEnum
CREATE TYPE "CardMasteryStatus" AS ENUM ('UNSEEN', 'EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "UserFlashcardProgress" ADD COLUMN     "status" "CardMasteryStatus" NOT NULL DEFAULT 'UNSEEN',
ALTER COLUMN "easeFactor" DROP NOT NULL,
ALTER COLUMN "easeFactor" DROP DEFAULT,
ALTER COLUMN "interval" DROP NOT NULL,
ALTER COLUMN "interval" DROP DEFAULT,
ALTER COLUMN "repetitions" DROP NOT NULL,
ALTER COLUMN "repetitions" DROP DEFAULT,
ALTER COLUMN "nextReview" DROP NOT NULL,
ALTER COLUMN "nextReview" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "UserFlashcardProgress_userId_status_idx" ON "UserFlashcardProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserFlashcardProgress_userId_status_lastReview_idx" ON "UserFlashcardProgress"("userId", "status", "lastReview");
