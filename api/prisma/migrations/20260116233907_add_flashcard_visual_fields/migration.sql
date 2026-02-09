-- CreateEnum
CREATE TYPE "VisualStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'UPLOADED');

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "highlightRegion" TEXT,
ADD COLUMN     "imageAssetId" TEXT,
ADD COLUMN     "useVisual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visualContext" TEXT,
ADD COLUMN     "visualRequirement" TEXT,
ADD COLUMN     "visualStatus" "VisualStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "UploadBatch" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Flashcard_visualStatus_idx" ON "Flashcard"("visualStatus");

-- CreateIndex
CREATE INDEX "Flashcard_useVisual_idx" ON "Flashcard"("useVisual");
