/*
  Warnings:

  - Made the column `lessonId` on table `ParsedBlock` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ParsedBlock" ALTER COLUMN "lessonId" SET NOT NULL;
