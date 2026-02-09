-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN IF NOT EXISTS "analysisPayload" JSONB;

-- AlterEnum
-- Step 1: Remove default constraint temporarily
ALTER TABLE "ExamQuestion" ALTER COLUMN "analysisStatus" DROP DEFAULT;

-- Step 2: Convert the column to text temporarily to allow data updates
ALTER TABLE "ExamQuestion" ALTER COLUMN "analysisStatus" TYPE TEXT USING "analysisStatus"::TEXT;

-- Step 3: Update existing COMPLETED to ANALYZED (now that it's text)
UPDATE "ExamQuestion" SET "analysisStatus" = 'ANALYZED' WHERE "analysisStatus" = 'COMPLETED';

-- Step 4: Drop the old enum (CASCADE to handle any remaining dependencies)
DROP TYPE IF EXISTS "AnalysisStatus" CASCADE;

-- Step 5: Create the new enum with all values
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'ANALYZED', 'KNOWLEDGE_READY', 'CONTENT_READY', 'FAILED');

-- Step 6: Convert the column back to the new enum type
ALTER TABLE "ExamQuestion" ALTER COLUMN "analysisStatus" TYPE "AnalysisStatus" USING "analysisStatus"::"AnalysisStatus";

-- Step 7: Restore the default constraint
ALTER TABLE "ExamQuestion" ALTER COLUMN "analysisStatus" SET DEFAULT 'PENDING'::"AnalysisStatus";
