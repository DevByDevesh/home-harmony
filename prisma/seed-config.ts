/**
 * Idempotent config seed: copies the existing placeholder plans and service categories
 * from src/lib/admin/config.ts into PostgreSQL. Creates only missing rows (upsert by slug,
 * update: {}), so admin edits are never overwritten. No payments, subscribers or providers are created.
 * Run: bun prisma/seed-config.ts
 */
import { defaultCategories, defaultPlans } from "../src/lib/admin/config";
import { requireDb } from "../src/lib/db/client.server";

const db = await requireDb();
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const p of defaultPlans) {
  await db.subscriptionPlan.upsert({
    where: { slug: p.id.toLowerCase().replace(/_/g, "-") }, update: {},
    create: { slug: p.id.toLowerCase().replace(/_/g, "-"), name: p.name, audience: p.audience, monthlyPrice: p.monthly, annualPrice: p.annual, active: p.enabled, listingLimit: p.listingLimit, featuredAllowance: p.featuredAllowance, analyticsAccess: p.analytics, leadLimit: p.leadLimit, teamSeats: p.teamSeats, features: { marketplace: p.marketplace } },
  });
}
for (const c of defaultCategories) {
  await db.serviceCategory.upsert({ where: { slug: slugify(c.name) }, update: {}, create: { slug: slugify(c.name), name: c.name, enabled: c.enabled, commissionPct: c.commissionPct } });
}
console.log("plans:", await db.subscriptionPlan.count(), "categories:", await db.serviceCategory.count());
process.exit(0);
