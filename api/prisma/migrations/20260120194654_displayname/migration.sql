/*
  Warnings:

  - You are about to drop the column `name` on the `PrerequisiteNode` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[canonicalKey]` on the table `PrerequisiteNode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `canonicalKey` to the `PrerequisiteNode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `PrerequisiteNode` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PrerequisiteNode_name_idx";

-- DropIndex
DROP INDEX "PrerequisiteNode_name_key";

-- AlterTable
ALTER TABLE "PrerequisiteNode" DROP COLUMN "name",
ADD COLUMN     "canonicalKey" TEXT NOT NULL,
ADD COLUMN     "displayName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PrerequisiteNode_canonicalKey_key" ON "PrerequisiteNode"("canonicalKey");

-- CreateIndex
CREATE INDEX "PrerequisiteNode_canonicalKey_idx" ON "PrerequisiteNode"("canonicalKey");
