CREATE TYPE "PromotionType" AS ENUM ('FEATURED', 'BOOST');
ALTER TABLE "FeaturedListing" ADD COLUMN "promotionType" "PromotionType" NOT NULL DEFAULT 'FEATURED';
CREATE INDEX "FeaturedListing_promotionType_active_idx" ON "FeaturedListing"("promotionType", "active");
