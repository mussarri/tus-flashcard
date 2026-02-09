/*
  Warnings:

  - You are about to drop the column `lesson` on the `UnresolvedConceptHint` table. All the data in the column will be lost.
  - You are about to drop the column `subtopic` on the `UnresolvedConceptHint` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `UnresolvedConceptHint` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[normalizedHint,topicId,subtopicId]` on the table `UnresolvedConceptHint` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UnresolvedConceptHint_lesson_idx";

-- DropIndex
DROP INDEX "UnresolvedConceptHint_normalizedHint_key";

-- DropIndex
DROP INDEX "UnresolvedConceptHint_normalizedHint_lesson_key";

-- AlterTable
ALTER TABLE "UnresolvedConceptHint" DROP COLUMN "lesson",
DROP COLUMN "subtopic",
DROP COLUMN "topic",
ADD COLUMN     "lessonId" TEXT,
ADD COLUMN     "subtopicId" TEXT,
ADD COLUMN     "topicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UnresolvedConceptHint_normalizedHint_topicId_subtopicId_key" ON "UnresolvedConceptHint"("normalizedHint", "topicId", "subtopicId");
