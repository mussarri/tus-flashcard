-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('ACTIVE', 'MERGED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "mergedIntoId" TEXT,
ADD COLUMN     "status" "TopicStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Topic_status_idx" ON "Topic"("status");

-- CreateIndex
CREATE INDEX "Topic_mergedIntoId_idx" ON "Topic"("mergedIntoId");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
