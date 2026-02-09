-- CreateEnum
CREATE TYPE "EdgeStrength" AS ENUM ('WEAK', 'MEDIUM', 'STRONG');

-- CreateTable
CREATE TABLE "PrerequisiteNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrerequisiteNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrerequisiteTopicEdge" (
    "id" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "strength" "EdgeStrength" NOT NULL DEFAULT 'WEAK',
    "source" TEXT NOT NULL DEFAULT 'QUESTION_ANALYSIS',
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrerequisiteTopicEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrerequisiteNode_name_key" ON "PrerequisiteNode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TopicNode_name_key" ON "TopicNode"("name");

-- CreateIndex
CREATE INDEX "PrerequisiteNode_name_idx" ON "PrerequisiteNode"("name");

-- CreateIndex
CREATE INDEX "TopicNode_name_idx" ON "TopicNode"("name");

-- CreateIndex
CREATE INDEX "TopicNode_lesson_idx" ON "TopicNode"("lesson");

-- CreateIndex
CREATE UNIQUE INDEX "PrerequisiteTopicEdge_prerequisiteId_topicId_key" ON "PrerequisiteTopicEdge"("prerequisiteId", "topicId");

-- CreateIndex
CREATE INDEX "PrerequisiteTopicEdge_prerequisiteId_idx" ON "PrerequisiteTopicEdge"("prerequisiteId");

-- CreateIndex
CREATE INDEX "PrerequisiteTopicEdge_topicId_idx" ON "PrerequisiteTopicEdge"("topicId");

-- CreateIndex
CREATE INDEX "PrerequisiteTopicEdge_strength_idx" ON "PrerequisiteTopicEdge"("strength");

-- CreateIndex
CREATE INDEX "PrerequisiteTopicEdge_frequency_idx" ON "PrerequisiteTopicEdge"("frequency");

-- AddForeignKey
ALTER TABLE "PrerequisiteTopicEdge" ADD CONSTRAINT "PrerequisiteTopicEdge_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "PrerequisiteNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrerequisiteTopicEdge" ADD CONSTRAINT "PrerequisiteTopicEdge_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TopicNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;