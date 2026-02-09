-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('MANUAL', 'BULK_UPLOAD');

-- AlterEnum
ALTER TYPE "AnalysisStatus" ADD VALUE 'RAW';

-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN     "rawText" TEXT,
ADD COLUMN     "source" "QuestionSource" NOT NULL DEFAULT 'MANUAL';
