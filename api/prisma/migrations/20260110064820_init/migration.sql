-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARSED', 'REVIEWING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('IMAGE', 'PDF');

-- CreateEnum
CREATE TYPE "OCRStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('TEXT', 'TABLE', 'ALGORITHM');

-- CreateEnum
CREATE TYPE "ClassificationStatus" AS ENUM ('PENDING', 'CLASSIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('MEASURED', 'TRAP', 'CONTEXT');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('SPOT', 'CLINICAL_TIP', 'COMPARISON', 'TRAP');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "UploadBatch" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "UploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadPage" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "fileType" "FileType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "ocrStatus" "OCRStatus" NOT NULL DEFAULT 'PENDING',
    "ocrJobId" TEXT,
    "ocrError" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "blockType" "BlockType" NOT NULL,
    "blockIndex" INTEGER NOT NULL,
    "rawText" TEXT,
    "confidence" DOUBLE PRECISION,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "tableData" JSONB,
    "algorithmData" JSONB,
    "classificationStatus" "ClassificationStatus" NOT NULL DEFAULT 'PENDING',
    "classifiedAt" TIMESTAMP(3),
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "editedText" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParsedBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedContent" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "blockType" "BlockType" NOT NULL,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgePoint" (
    "id" TEXT NOT NULL,
    "approvedContentId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "examRelevance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "examType" TEXT,
    "questionNumber" INTEGER,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "lesson" TEXT,
    "topic" TEXT,
    "subtopic" TEXT,
    "traps" TEXT[],
    "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestionKnowledgePoint" (
    "id" TEXT NOT NULL,
    "examQuestionId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamQuestionKnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "cardType" "CardType" NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "similarityChecked" BOOLEAN NOT NULL DEFAULT false,
    "similarCardIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "scenarioType" TEXT,
    "similarityChecked" BOOLEAN NOT NULL DEFAULT false,
    "similarQuestionIds" TEXT[],
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "timesShown" INTEGER NOT NULL DEFAULT 0,
    "correctRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionKnowledgePoint" (
    "id" TEXT NOT NULL,
    "generatedQuestionId" TEXT,
    "knowledgePointId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionKnowledgePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSimilarity" (
    "id" TEXT NOT NULL,
    "sourceQuestionId" TEXT NOT NULL,
    "targetQuestionId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFlashcardProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "lastReview" TIMESTAMP(3),
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFlashcardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedQuestionId" TEXT NOT NULL,
    "selectedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeSpent" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWeakness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastIncorrectAt" TIMESTAMP(3),
    "weaknessScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWeakness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadBatch_status_idx" ON "UploadBatch"("status");

-- CreateIndex
CREATE INDEX "UploadBatch_createdAt_idx" ON "UploadBatch"("createdAt");

-- CreateIndex
CREATE INDEX "UploadPage_batchId_idx" ON "UploadPage"("batchId");

-- CreateIndex
CREATE INDEX "UploadPage_ocrStatus_idx" ON "UploadPage"("ocrStatus");

-- CreateIndex
CREATE INDEX "UploadPage_pageNumber_idx" ON "UploadPage"("pageNumber");

-- CreateIndex
CREATE INDEX "ParsedBlock_pageId_idx" ON "ParsedBlock"("pageId");

-- CreateIndex
CREATE INDEX "ParsedBlock_blockType_idx" ON "ParsedBlock"("blockType");

-- CreateIndex
CREATE INDEX "ParsedBlock_approvalStatus_idx" ON "ParsedBlock"("approvalStatus");

-- CreateIndex
CREATE INDEX "ParsedBlock_classificationStatus_idx" ON "ParsedBlock"("classificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedContent_blockId_key" ON "ApprovedContent"("blockId");

-- CreateIndex
CREATE INDEX "ApprovedContent_batchId_idx" ON "ApprovedContent"("batchId");

-- CreateIndex
CREATE INDEX "ApprovedContent_extractionStatus_idx" ON "ApprovedContent"("extractionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePoint_normalizedKey_key" ON "KnowledgePoint"("normalizedKey");

-- CreateIndex
CREATE INDEX "KnowledgePoint_approvedContentId_idx" ON "KnowledgePoint"("approvedContentId");

-- CreateIndex
CREATE INDEX "KnowledgePoint_blockId_idx" ON "KnowledgePoint"("blockId");

-- CreateIndex
CREATE INDEX "KnowledgePoint_normalizedKey_idx" ON "KnowledgePoint"("normalizedKey");

-- CreateIndex
CREATE INDEX "KnowledgePoint_category_subcategory_idx" ON "KnowledgePoint"("category", "subcategory");

-- CreateIndex
CREATE INDEX "KnowledgePoint_priority_idx" ON "KnowledgePoint"("priority");

-- CreateIndex
CREATE INDEX "ExamQuestion_year_idx" ON "ExamQuestion"("year");

-- CreateIndex
CREATE INDEX "ExamQuestion_examType_idx" ON "ExamQuestion"("examType");

-- CreateIndex
CREATE INDEX "ExamQuestion_lesson_topic_subtopic_idx" ON "ExamQuestion"("lesson", "topic", "subtopic");

-- CreateIndex
CREATE INDEX "ExamQuestion_analysisStatus_idx" ON "ExamQuestion"("analysisStatus");

-- CreateIndex
CREATE INDEX "ExamQuestionKnowledgePoint_examQuestionId_idx" ON "ExamQuestionKnowledgePoint"("examQuestionId");

-- CreateIndex
CREATE INDEX "ExamQuestionKnowledgePoint_knowledgePointId_idx" ON "ExamQuestionKnowledgePoint"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamQuestionKnowledgePoint_examQuestionId_knowledgePointId__key" ON "ExamQuestionKnowledgePoint"("examQuestionId", "knowledgePointId", "relationshipType");

-- CreateIndex
CREATE INDEX "Flashcard_knowledgePointId_idx" ON "Flashcard"("knowledgePointId");

-- CreateIndex
CREATE INDEX "Flashcard_cardType_idx" ON "Flashcard"("cardType");

-- CreateIndex
CREATE INDEX "Flashcard_approvalStatus_idx" ON "Flashcard"("approvalStatus");

-- CreateIndex
CREATE INDEX "GeneratedQuestion_approvalStatus_idx" ON "GeneratedQuestion"("approvalStatus");

-- CreateIndex
CREATE INDEX "GeneratedQuestion_scenarioType_idx" ON "GeneratedQuestion"("scenarioType");

-- CreateIndex
CREATE INDEX "QuestionKnowledgePoint_generatedQuestionId_idx" ON "QuestionKnowledgePoint"("generatedQuestionId");

-- CreateIndex
CREATE INDEX "QuestionKnowledgePoint_knowledgePointId_idx" ON "QuestionKnowledgePoint"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionKnowledgePoint_generatedQuestionId_knowledgePointId_key" ON "QuestionKnowledgePoint"("generatedQuestionId", "knowledgePointId", "relationshipType");

-- CreateIndex
CREATE INDEX "QuestionSimilarity_sourceQuestionId_idx" ON "QuestionSimilarity"("sourceQuestionId");

-- CreateIndex
CREATE INDEX "QuestionSimilarity_targetQuestionId_idx" ON "QuestionSimilarity"("targetQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSimilarity_sourceQuestionId_targetQuestionId_key" ON "QuestionSimilarity"("sourceQuestionId", "targetQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserFlashcardProgress_userId_idx" ON "UserFlashcardProgress"("userId");

-- CreateIndex
CREATE INDEX "UserFlashcardProgress_flashcardId_idx" ON "UserFlashcardProgress"("flashcardId");

-- CreateIndex
CREATE INDEX "UserFlashcardProgress_nextReview_idx" ON "UserFlashcardProgress"("nextReview");

-- CreateIndex
CREATE UNIQUE INDEX "UserFlashcardProgress_userId_flashcardId_key" ON "UserFlashcardProgress"("userId", "flashcardId");

-- CreateIndex
CREATE INDEX "UserAnswer_userId_idx" ON "UserAnswer"("userId");

-- CreateIndex
CREATE INDEX "UserAnswer_generatedQuestionId_idx" ON "UserAnswer"("generatedQuestionId");

-- CreateIndex
CREATE INDEX "UserAnswer_answeredAt_idx" ON "UserAnswer"("answeredAt");

-- CreateIndex
CREATE INDEX "UserWeakness_userId_idx" ON "UserWeakness"("userId");

-- CreateIndex
CREATE INDEX "UserWeakness_knowledgePointId_idx" ON "UserWeakness"("knowledgePointId");

-- CreateIndex
CREATE INDEX "UserWeakness_weaknessScore_idx" ON "UserWeakness"("weaknessScore");

-- CreateIndex
CREATE UNIQUE INDEX "UserWeakness_userId_knowledgePointId_key" ON "UserWeakness"("userId", "knowledgePointId");

-- AddForeignKey
ALTER TABLE "UploadPage" ADD CONSTRAINT "UploadPage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "UploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedBlock" ADD CONSTRAINT "ParsedBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "UploadPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedContent" ADD CONSTRAINT "ApprovedContent_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "UploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedContent" ADD CONSTRAINT "ApprovedContent_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ParsedBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_approvedContentId_fkey" FOREIGN KEY ("approvedContentId") REFERENCES "ApprovedContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgePoint" ADD CONSTRAINT "KnowledgePoint_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ParsedBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestionKnowledgePoint" ADD CONSTRAINT "ExamQuestionKnowledgePoint_examQuestionId_fkey" FOREIGN KEY ("examQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestionKnowledgePoint" ADD CONSTRAINT "ExamQuestionKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionKnowledgePoint" ADD CONSTRAINT "QuestionKnowledgePoint_generatedQuestionId_fkey" FOREIGN KEY ("generatedQuestionId") REFERENCES "GeneratedQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionKnowledgePoint" ADD CONSTRAINT "QuestionKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSimilarity" ADD CONSTRAINT "QuestionSimilarity_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSimilarity" ADD CONSTRAINT "QuestionSimilarity_targetQuestionId_fkey" FOREIGN KEY ("targetQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlashcardProgress" ADD CONSTRAINT "UserFlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFlashcardProgress" ADD CONSTRAINT "UserFlashcardProgress_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_generatedQuestionId_fkey" FOREIGN KEY ("generatedQuestionId") REFERENCES "GeneratedQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWeakness" ADD CONSTRAINT "UserWeakness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWeakness" ADD CONSTRAINT "UserWeakness_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
