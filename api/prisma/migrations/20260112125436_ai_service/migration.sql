-- CreateEnum
CREATE TYPE "AITaskType" AS ENUM ('VISION_PARSE', 'CONTENT_CLASSIFY', 'KNOWLEDGE_EXTRACTION', 'FLASHCARD_GENERATION', 'QUESTION_GENERATION', 'EMBEDDING');

-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('OPENAI', 'GEMINI');

-- AlterTable
ALTER TABLE "UploadBatch" ADD COLUMN     "contentTypeHint" "ContentType";

-- CreateTable
CREATE TABLE "AITaskConfig" (
    "id" TEXT NOT NULL,
    "taskType" "AITaskType" NOT NULL,
    "provider" "AIProviderType" NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AITaskConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AITaskConfig_taskType_key" ON "AITaskConfig"("taskType");

-- CreateIndex
CREATE INDEX "AITaskConfig_taskType_idx" ON "AITaskConfig"("taskType");

-- CreateIndex
CREATE INDEX "AITaskConfig_isActive_idx" ON "AITaskConfig"("isActive");
