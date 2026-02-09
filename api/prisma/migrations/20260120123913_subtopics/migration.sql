-- CreateTable
CREATE TABLE "PrerequisiteSubtopicEdge" (
    "id" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "subtopicId" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "strength" "EdgeStrength" NOT NULL DEFAULT 'WEAK',
    "source" TEXT NOT NULL DEFAULT 'QUESTION_ANALYSIS',
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrerequisiteSubtopicEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrerequisiteSubtopicEdge_prerequisiteId_idx" ON "PrerequisiteSubtopicEdge"("prerequisiteId");

-- CreateIndex
CREATE INDEX "PrerequisiteSubtopicEdge_subtopicId_idx" ON "PrerequisiteSubtopicEdge"("subtopicId");

-- CreateIndex
CREATE INDEX "PrerequisiteSubtopicEdge_strength_idx" ON "PrerequisiteSubtopicEdge"("strength");

-- CreateIndex
CREATE INDEX "PrerequisiteSubtopicEdge_frequency_idx" ON "PrerequisiteSubtopicEdge"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "PrerequisiteSubtopicEdge_prerequisiteId_subtopicId_key" ON "PrerequisiteSubtopicEdge"("prerequisiteId", "subtopicId");

-- AddForeignKey
ALTER TABLE "PrerequisiteSubtopicEdge" ADD CONSTRAINT "PrerequisiteSubtopicEdge_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "PrerequisiteNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrerequisiteSubtopicEdge" ADD CONSTRAINT "PrerequisiteSubtopicEdge_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
