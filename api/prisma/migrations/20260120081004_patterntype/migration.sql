-- DropIndex
DROP INDEX "Topic_name_key";

-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN     "patternConfidence" DOUBLE PRECISION,
ADD COLUMN     "patternType" TEXT;
