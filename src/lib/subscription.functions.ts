import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/auth/guards.server";

const PLAN_SLUG = "free-6-months";

function addSixMonths(from: Date) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 6);
  return d;
}

/** One-time promotional offer: every active account can claim six months free. */
export const claimFreeSixMonthsFn = createServerFn({ method: "POST" }).handler(async () => {
  const me = await requireUser();
  const { requireDb } = await import("@/lib/db/client.server");
  const d = await requireDb();

  const existingClaim = await d.subscription.findFirst({
    where: { userId: me.id, plan: { slug: PLAN_SLUG } },
    select: { id: true },
  });
  if (existingClaim) return { ok: false as const, message: "Your 6-month free subscription has already been claimed." };

  const openSubscription = await d.subscription.findFirst({
    where: { userId: me.id, status: { in: ["TRIAL", "ACTIVE", "PAST_DUE", "PAUSED"] } },
    select: { id: true },
  });
  if (openSubscription) return { ok: false as const, message: "You already have an active subscription." };

  const now = new Date();
  const renewsAt = addSixMonths(now);

  const result = await d.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.upsert({
      where: { slug: PLAN_SLUG },
      create: {
        name: "Free 6 Months", slug: PLAN_SLUG,
        description: "Six months free for HouseProvider members.", audience: "ALL",
        monthlyPrice: 0, annualPrice: 0, currency: "INR", active: true,
        features: ["6 months free", "No payment required"],
        listingLimit: null, featuredAllowance: 0, analyticsAccess: false, leadLimit: null, teamSeats: 1,
      },
      update: { name: "Free 6 Months", description: "Six months free for HouseProvider members.", monthlyPrice: 0, annualPrice: 0, active: true },
      select: { id: true },
    });
    return tx.subscription.create({
      data: { userId: me.id, planId: plan.id, status: "ACTIVE", cycle: "ANNUAL", startedAt: now, renewsAt, provider: "DEMO", providerReference: "FREE6M-" + me.id },
      select: { id: true, renewsAt: true },
    });
  });

  const { writeAudit } = await import("@/lib/auth/audit.server");
  await writeAudit({ actorId: me.id, action: "subscription.free_6_months.claim", entityType: "Subscription", entityId: result.id, metadata: { offer: PLAN_SLUG, months: 6 } });
  return { ok: true as const, renewsAt: result.renewsAt.toISOString() };
});