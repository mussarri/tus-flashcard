-- AlterTable
ALTER TABLE "KnowledgePoint" ADD COLUMN     "createdFromExamQuestionId" TEXT,
ALTER COLUMN "approvedContentId" DROP NOT NULL,
ALTER COLUMN "blockId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "KnowledgePoint_createdFromExamQuestionId_idx" ON "KnowledgePoint"("createdFromExamQuestionId");

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_createdFromExamQuestionId_fkey" FOREIGN KEY ("createdFromExamQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
