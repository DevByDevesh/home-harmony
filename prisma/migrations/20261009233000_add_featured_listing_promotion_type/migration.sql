-- Keep the deployed Prisma schema aligned with the existing FeaturedListing table.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromotionType') THEN
    CREATE TYPE "PromotionType" AS ENUM ('FEATURED', 'BOOST');
  END IF;
END
$$;

ALTER TABLE "FeaturedListing"
  ADD COLUMN IF NOT EXISTS "promotionType" "PromotionType" NOT NULL DEFAULT 'FEATURED';
