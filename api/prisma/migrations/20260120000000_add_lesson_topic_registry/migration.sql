-- CreateTable: Registry tables for lessons and topics
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "knowledgePointCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "lesson" TEXT NOT NULL,
    "description" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "knowledgePointCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subtopic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "topicName" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "description" TEXT,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "knowledgePointCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subtopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_name_key" ON "Lesson"("name");

-- CreateIndex
CREATE INDEX "Lesson_name_idx" ON "Lesson"("name");

-- CreateIndex
CREATE INDEX "Lesson_questionCount_idx" ON "Lesson"("questionCount");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_lesson_key" ON "Topic"("name", "lesson");

-- CreateIndex
CREATE INDEX "Topic_name_idx" ON "Topic"("name");

-- CreateIndex
CREATE INDEX "Topic_lesson_idx" ON "Topic"("lesson");

-- CreateIndex
CREATE INDEX "Topic_questionCount_idx" ON "Topic"("questionCount");

-- CreateIndex
CREATE UNIQUE INDEX "Subtopic_name_topicName_lesson_key" ON "Subtopic"("name", "topicName", "lesson");

-- CreateIndex
CREATE INDEX "Subtopic_name_idx" ON "Subtopic"("name");

-- CreateIndex
CREATE INDEX "Subtopic_topicName_idx" ON "Subtopic"("topicName");

-- CreateIndex
CREATE INDEX "Subtopic_lesson_idx" ON "Subtopic"("lesson");

-- CreateIndex
CREATE INDEX "Subtopic_questionCount_idx" ON "Subtopic"("questionCount");
