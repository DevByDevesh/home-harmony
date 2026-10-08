-- Persist the HouseProvider verified badge earned by claiming the one-time
-- six-month promotional offer. Existing offer claimers are backfilled.
ALTER TABLE "User"
ADD COLUMN "verifiedBadge" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" AS u
SET "verifiedBadge" = true
WHERE EXISTS (
  SELECT 1
  FROM "Subscription" AS s
  INNER JOIN "SubscriptionPlan" AS p ON p."id" = s."planId"
  WHERE s."userId" = u."id"
    AND p."slug" = 'free-6-months'
);