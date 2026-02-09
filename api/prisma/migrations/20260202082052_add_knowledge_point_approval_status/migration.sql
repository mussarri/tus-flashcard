-- CreateEnum
CREATE TYPE "KnowledgePointApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MERGED');

-- AlterTable
ALTER TABLE "KnowledgePoint" ADD COLUMN     "approvalStatus" "KnowledgePointApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejectionReason" TEXT;
