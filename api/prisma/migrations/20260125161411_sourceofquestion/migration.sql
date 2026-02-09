/*
  Warnings:

  - Added the required column `sourceType` to the `GeneratedQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GeneratedQuestionSource" AS ENUM ('ADMIN', 'AI_GENERATION');

-- AlterTable
ALTER TABLE "GeneratedQuestion" ADD COLUMN     "sourceType" "GeneratedQuestionSource" NOT NULL;
