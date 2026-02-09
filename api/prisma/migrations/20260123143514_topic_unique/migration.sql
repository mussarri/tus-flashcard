/*
  Warnings:

  - A unique constraint covering the columns `[name,lessonId]` on the table `Topic` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_lessonId_key" ON "Topic"("name", "lessonId");
