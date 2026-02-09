-- CreateEnum
CREATE TYPE "PrerequisiteStatus" AS ENUM ('ACTIVE', 'NEEDS_REVIEW');

-- AlterTable
ALTER TABLE "PrerequisiteNode" ADD COLUMN     "status" "PrerequisiteStatus" NOT NULL DEFAULT 'ACTIVE';
