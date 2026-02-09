-- AlterEnum
ALTER TYPE "PrerequisiteStatus" ADD VALUE 'DEPRECATED';

-- AlterTable
ALTER TABLE "PrerequisiteNode" ADD COLUMN     "reviewReason" TEXT;

-- CreateIndex
CREATE INDEX "PrerequisiteNode_status_idx" ON "PrerequisiteNode"("status");
