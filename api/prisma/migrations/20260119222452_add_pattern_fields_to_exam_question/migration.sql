-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN     "patternConfidence" DOUBLE PRECISION,
ADD COLUMN     "patternType" TEXT;

-- CreateIndex
CREATE INDEX "ExamQuestion_patternType_idx" ON "ExamQuestion"("patternType");
