-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "preferredLabel" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptAlias" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrerequisiteConcept" (
    "id" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrerequisiteConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Concept_preferredLabel_idx" ON "Concept"("preferredLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_normalizedLabel_key" ON "Concept"("normalizedLabel");

-- CreateIndex
CREATE INDEX "ConceptAlias_conceptId_idx" ON "ConceptAlias"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptAlias_normalizedAlias_key" ON "ConceptAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "PrerequisiteConcept_conceptId_idx" ON "PrerequisiteConcept"("conceptId");

-- CreateIndex
CREATE INDEX "PrerequisiteConcept_prerequisiteId_idx" ON "PrerequisiteConcept"("prerequisiteId");

-- CreateIndex
CREATE UNIQUE INDEX "PrerequisiteConcept_prerequisiteId_conceptId_key" ON "PrerequisiteConcept"("prerequisiteId", "conceptId");

-- AddForeignKey
ALTER TABLE "ConceptAlias" ADD CONSTRAINT "ConceptAlias_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrerequisiteConcept" ADD CONSTRAINT "PrerequisiteConcept_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "PrerequisiteNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrerequisiteConcept" ADD CONSTRAINT "PrerequisiteConcept_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
