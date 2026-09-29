-- Idempotent config seed: the existing placeholder plans and service categories from
-- src/lib/admin/config.ts. ON CONFLICT DO NOTHING, so re-running never duplicates or overwrites admin edits.
-- No payments, subscribers or providers are created.
-- Run: psql "$DATABASE_URL" -f prisma/seed-config.sql
INSERT INTO "SubscriptionPlan" (id, slug, name, audience, "monthlyPrice", "annualPrice", active, "listingLimit", "featuredAllowance", "analyticsAccess", "leadLimit", "teamSeats", features, "updatedAt") VALUES
 (gen_random_uuid()::text, 'free', 'Free', 'ALL', 0, 0, true, 1, 0, false, 10, 1, '{"marketplace":true}', now()),
 (gen_random_uuid()::text, 'owner-pro', 'Owner Pro', 'OWNER', 499, 4990, true, 5, 1, true, NULL, 1, '{"marketplace":true}', now()),
 (gen_random_uuid()::text, 'agent-pro', 'Agent Pro', 'AGENT', 1499, 14990, true, 50, 5, true, NULL, 3, '{"marketplace":true}', now()),
 (gen_random_uuid()::text, 'business', 'Business', 'BUSINESS', 4999, 49990, false, NULL, 20, true, NULL, 15, '{"marketplace":true}', now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "ServiceCategory" (id, slug, name, enabled, "commissionPct") VALUES
 (gen_random_uuid()::text, 'packers-and-movers', 'Packers & Movers', true, 10),
 (gen_random_uuid()::text, 'cleaning', 'Cleaning', true, 10),
 (gen_random_uuid()::text, 'painting', 'Painting', true, 10),
 (gen_random_uuid()::text, 'interior-design', 'Interior Design', true, 10),
 (gen_random_uuid()::text, 'furniture-rental', 'Furniture Rental', true, 10),
 (gen_random_uuid()::text, 'home-repairs', 'Home Repairs', true, 10),
 (gen_random_uuid()::text, 'pest-control', 'Pest Control', true, 10),
 (gen_random_uuid()::text, 'property-management', 'Property Management', true, 10),
 (gen_random_uuid()::text, 'legal-services', 'Legal Services', true, 10),
 (gen_random_uuid()::text, 'home-loans', 'Home Loans', true, 10),
 (gen_random_uuid()::text, 'insurance', 'Insurance', false, 10),
 (gen_random_uuid()::text, 'relocation-services', 'Relocation Services', false, 10)
ON CONFLICT (slug) DO NOTHING;
