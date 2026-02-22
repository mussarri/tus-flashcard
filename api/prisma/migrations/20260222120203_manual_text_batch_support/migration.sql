-- CreateEnum
CREATE TYPE "BatchSourceType" AS ENUM ('FILE_UPLOAD', 'MANUAL_TEXT');

-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'TEXT';

-- AlterTable
ALTER TABLE "UploadBatch" ADD COLUMN     "lessonId" TEXT,
ADD COLUMN     "sourceType" "BatchSourceType" NOT NULL DEFAULT 'FILE_UPLOAD',
ADD COLUMN     "subtopicId" TEXT,
ADD COLUMN     "topicId" TEXT;

-- AlterTable
ALTER TABLE "UploadPage" ADD COLUMN     "rawText" TEXT,
ADD COLUMN     "textHash" TEXT,
ALTER COLUMN "filePath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ParsedBlock_pageId_blockIndex_idx" ON "ParsedBlock"("pageId", "blockIndex");

-- CreateIndex
CREATE INDEX "UploadBatch_sourceType_idx" ON "UploadBatch"("sourceType");

-- CreateIndex
CREATE INDEX "UploadPage_textHash_idx" ON "UploadPage"("textHash");
