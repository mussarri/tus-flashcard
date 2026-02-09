/*
  Warnings:

  - A unique constraint covering the columns `[normalizedHint]` on the table `UnresolvedConceptHint` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalizedHint` to the `UnresolvedConceptHint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UnresolvedConceptHint" ADD COLUMN     "normalizedHint" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UnresolvedConceptHint_normalizedHint_key" ON "UnresolvedConceptHint"("normalizedHint");

-- AddForeignKey
ALTER TABLE "UnresolvedConceptHint" ADD CONSTRAINT "UnresolvedConceptHint_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
