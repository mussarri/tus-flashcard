-- CreateEnum
CREATE TYPE "AtomicityStatus" AS ENUM ('UNCHECKED', 'ATOMIC', 'NON_ATOMIC', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AITaskType" ADD VALUE 'KP_ATOMICITY_VALIDATE';
ALTER TYPE "AITaskType" ADD VALUE 'KP_ATOMICITY_SPLIT';

-- AlterTable
ALTER TABLE "KnowledgePoint" ADD COLUMN     "atomicityReason" TEXT,
ADD COLUMN     "atomicityScore" DOUBLE PRECISION,
ADD COLUMN     "atomicityStatus" "AtomicityStatus" NOT NULL DEFAULT 'UNCHECKED',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "replacedAt" TIMESTAMP(3),
ADD COLUMN     "splitFromId" TEXT,
ADD COLUMN     "splitGroupId" TEXT;

-- CreateIndex
CREATE INDEX "KnowledgePoint_atomicityStatus_idx" ON "KnowledgePoint"("atomicityStatus");

-- CreateIndex
CREATE INDEX "KnowledgePoint_isActive_idx" ON "KnowledgePoint"("isActive");

-- CreateIndex
CREATE INDEX "KnowledgePoint_splitFromId_idx" ON "KnowledgePoint"("splitFromId");

-- CreateIndex
CREATE INDEX "KnowledgePoint_splitGroupId_idx" ON "KnowledgePoint"("splitGroupId");

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_splitFromId_fkey" FOREIGN KEY ("splitFromId") REFERENCES "KnowledgePoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
