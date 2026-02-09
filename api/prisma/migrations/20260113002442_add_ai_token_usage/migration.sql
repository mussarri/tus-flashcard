-- CreateTable
CREATE TABLE "AITokenUsage" (
    "id" TEXT NOT NULL,
    "taskType" "AITaskType" NOT NULL,
    "provider" "AIProviderType" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "costUSD" DOUBLE PRECISION,
    "batchId" TEXT,
    "pageId" TEXT,
    "topicId" TEXT,
    "knowledgePointId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AITokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AITokenUsage_taskType_idx" ON "AITokenUsage"("taskType");

-- CreateIndex
CREATE INDEX "AITokenUsage_provider_idx" ON "AITokenUsage"("provider");

-- CreateIndex
CREATE INDEX "AITokenUsage_model_idx" ON "AITokenUsage"("model");

-- CreateIndex
CREATE INDEX "AITokenUsage_batchId_idx" ON "AITokenUsage"("batchId");

-- CreateIndex
CREATE INDEX "AITokenUsage_pageId_idx" ON "AITokenUsage"("pageId");

-- CreateIndex
CREATE INDEX "AITokenUsage_topicId_idx" ON "AITokenUsage"("topicId");

-- CreateIndex
CREATE INDEX "AITokenUsage_knowledgePointId_idx" ON "AITokenUsage"("knowledgePointId");

-- CreateIndex
CREATE INDEX "AITokenUsage_createdAt_idx" ON "AITokenUsage"("createdAt");
