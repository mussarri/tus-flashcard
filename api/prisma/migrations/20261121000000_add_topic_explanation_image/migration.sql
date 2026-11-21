ALTER TABLE "TopicExplanation" ADD COLUMN "imageAssetId" TEXT;

CREATE INDEX "TopicExplanation_imageAssetId_idx" ON "TopicExplanation"("imageAssetId");

ALTER TABLE "TopicExplanation" ADD CONSTRAINT "TopicExplanation_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
