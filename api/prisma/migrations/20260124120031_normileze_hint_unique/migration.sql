/*
  Warnings:

  - A unique constraint covering the columns `[normalizedHint,lesson]` on the table `UnresolvedConceptHint` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UnresolvedConceptHint_hint_lesson_key";

-- CreateIndex
CREATE UNIQUE INDEX "UnresolvedConceptHint_normalizedHint_lesson_key" ON "UnresolvedConceptHint"("normalizedHint", "lesson");
