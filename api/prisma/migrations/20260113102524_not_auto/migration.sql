/*
  Warnings:

  - The values [PENDING] on the enum `ExtractionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExtractionStatus_new" AS ENUM ('NOT_STARTED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "ApprovedContent" ALTER COLUMN "extractionStatus" DROP DEFAULT;
ALTER TABLE "ApprovedContent" ALTER COLUMN "extractionStatus" TYPE "ExtractionStatus_new" USING ("extractionStatus"::text::"ExtractionStatus_new");
ALTER TYPE "ExtractionStatus" RENAME TO "ExtractionStatus_old";
ALTER TYPE "ExtractionStatus_new" RENAME TO "ExtractionStatus";
DROP TYPE "ExtractionStatus_old";
ALTER TABLE "ApprovedContent" ALTER COLUMN "extractionStatus" SET DEFAULT 'NOT_STARTED';
COMMIT;

-- AlterTable
ALTER TABLE "ApprovedContent" ALTER COLUMN "extractionStatus" SET DEFAULT 'NOT_STARTED';
