/**
 * Admin business modules on PostgreSQL: payments, subscriptions/plans, services, analytics counts.
 * Every call re-checks permissions server-side and audits changes. The payment provider stays DEMO:
 * nothing here charges, refunds or contacts a gateway — refunds are placeholder requests only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SeriesPoint } from "./analytics";

type Perm = "payments.view" | "payments.refund" | "subscriptions.manage" | "plans.edit" | "services.manage" | "analytics.view";
function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }
async function guard(p: Perm) { const { requirePermission } = await import("./auth/guards.server"); return requirePermission(p); }
async function db() { const { requireDb } = await import("./db/client.server"); return requireDb(); }
async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, string | number | boolean | null>) { const { writeAudit } = await import("./auth/audit.server"); await writeAudit({ actorId, action, entityType, entityId, metadata }); }
const id = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const nm = (n: string | undefined | null) => n || "—";
const fail = (message: string) => ({ ok: false as const, message });
const ok = { ok: true as const };

// ---------------- Payments ----------------
export type LivePayment = { id: string; user: string; product: string; amount: number; currency: string; status: string; provider: string; method: string | null; createdAt: string; invoice: string | null; refunds: { id: string; amount: number; status: string }[]; transactions: number };

export const listPaymentsFn = createServerFn({ method: "GET" }).handler(async (): Promise<LivePayment[]> => {
  try {
    await guard("payments.view");
    const rows = await (await db()).payment.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { name: true } }, invoice: { select: { number: true } }, refunds: { select: { id: true, amount: true, status: true } }, _count: { select: { transactions: true } } } });
    return rows.map((p) => ({ id: p.id, user: nm(p.user.name), product: p.product, amount: p.amount, currency: p.currency, status: p.status, provider: p.provider, method: p.methodLabel, createdAt: p.createdAt.toISOString(), invoice: p.invoice?.number ?? null, refunds: p.refunds, transactions: p._count.transactions }));
  } catch (e) { rethrow(e); }
});

/** Only bookkeeping transitions that move no money. SUCCEEDED/REFUNDED can only come from a real provider later. */
const payMoves: Record<string, string[]> = { PENDING: ["CANCELLED", "FAILED"], PROCESSING: ["FAILED", "CANCELLED"] };
export const setPaymentStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, status: z.enum(["CANCELLED", "FAILED"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("payments.view"); const d = await db();
      const p = await d.payment.findUnique({ where: { id: data.id }, select: { status: true, provider: true } });
      if (!p) return fail("Payment not found.");
      if (p.provider !== "DEMO") return fail("Only demo payments can be changed here.");
      if (!payMoves[p.status]?.includes(data.status)) return fail(`A ${p.status.toLowerCase()} payment can’t be marked ${data.status.toLowerCase()}.`);
      await d.payment.updateMany({ where: { id: data.id, status: p.status }, data: { status: data.status } });
      await audit(u.id, "admin.payment.status", "Payment", data.id, { to: data.status });
      return ok;
    } catch (e) { rethrow(e); }
  });

/** Super admin only. Creates a REQUESTED refund record; no provider is called and no money moves. */
export const requestRefundFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, reason: z.string().trim().max(300).optional() }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("payments.refund"); const d = await db();
      const p = await d.payment.findUnique({ where: { id: data.id }, select: { status: true, amount: true, refunds: { where: { status: { in: ["REQUESTED", "PROCESSED"] } }, select: { id: true } } } });
      if (!p) return fail("Payment not found.");
      if (p.status !== "SUCCEEDED") return fail("Only succeeded payments can have a refund requested.");
      if (p.refunds.length) return fail("A refund is already requested for this payment.");
      const r = await d.refund.create({ data: { paymentId: data.id, amount: p.amount, reason: data.reason ?? null, status: "REQUESTED" } });
      await audit(u.id, "admin.refund.request", "Payment", data.id, { refundId: r.id, amount: p.amount });
      return ok;
    } catch (e) { rethrow(e); }
  });

export const rejectRefundFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("payments.refund");
      const r = await (await db()).refund.updateMany({ where: { id: data.id, status: "REQUESTED" }, data: { status: "REJECTED", processedAt: new Date() } });
      if (!r.count) return fail("Refund not found or already handled.");
      await audit(u.id, "admin.refund.reject", "Refund", data.id, {});
      return ok;
    } catch (e) { rethrow(e); }
  });

// ---------------- Plans & subscriptions ----------------
export type LivePlan = { id: string; slug: string; name: string; audience: string; monthlyPrice: number; annualPrice: number; active: boolean; listingLimit: number | null; featuredAllowance: number; analyticsAccess: boolean; leadLimit: number | null; teamSeats: number; subscribers: number };
export type LiveSubscription = { id: string; user: string; email: string | null; plan: string; status: string; cycle: string; renewsAt: string | null; provider: string };

export const listPlansFn = createServerFn({ method: "GET" }).handler(async (): Promise<LivePlan[]> => {
  try {
    await guard("subscriptions.manage");
    const rows = await (await db()).subscriptionPlan.findMany({ orderBy: { monthlyPrice: "asc" }, include: { _count: { select: { subscriptions: true } } } });
    return rows.map(({ _count, createdAt: _c, updatedAt: _u, features: _f, currency: _cur, description: _d, ...p }) => ({ ...p, subscribers: _count.subscriptions }));
  } catch (e) { rethrow(e); }
});

const nat = z.number().int().min(0).max(10_000_000);
export const savePlanFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, name: z.string().trim().min(1).max(60), monthlyPrice: nat, annualPrice: nat, active: z.boolean(), listingLimit: nat.nullable(), featuredAllowance: nat, analyticsAccess: z.boolean(), leadLimit: nat.nullable(), teamSeats: z.number().int().min(1).max(1000) }).strict().parse(d))
  .handler(async ({ data: { id: planId, ...rest } }) => {
    try {
      const u = await guard("plans.edit");
      const r = await (await db()).subscriptionPlan.updateMany({ where: { id: planId }, data: rest });
      if (!r.count) return fail("Plan not found.");
      await audit(u.id, "admin.plan.update", "SubscriptionPlan", planId, { name: rest.name, monthlyPrice: rest.monthlyPrice, active: rest.active });
      return ok;
    } catch (e) { rethrow(e); }
  });

export const listSubscriptionsFn = createServerFn({ method: "GET" }).handler(async (): Promise<LiveSubscription[]> => {
  try {
    await guard("subscriptions.manage");
    const rows = await (await db()).subscription.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } } } });
    return rows.map((s) => ({ id: s.id, user: nm(s.user.name), email: s.user.email, plan: s.plan.name, status: s.status, cycle: s.cycle, renewsAt: s.renewsAt?.toISOString() ?? null, provider: s.provider }));
  } catch (e) { rethrow(e); }
});

/** Starts a DEMO trial of an active plan for an existing account (no charge). One open subscription per user. */
export const assignPlanFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(200), planId: id, cycle: z.enum(["MONTHLY", "ANNUAL"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("subscriptions.manage"); const d = await db();
      const user = await d.user.findUnique({ where: { email: data.email }, select: { id: true } });
      if (!user) return fail("No account with that email.");
      const plan = await d.subscriptionPlan.findFirst({ where: { id: data.planId, active: true }, select: { id: true, name: true } });
      if (!plan) return fail("That plan isn’t enabled.");
      if (await d.subscription.findFirst({ where: { userId: user.id, status: { in: ["TRIAL", "ACTIVE", "PAST_DUE", "PAUSED"] } }, select: { id: true } })) return fail("This account already has an open subscription.");
      const trialDays = 14; const renewsAt = new Date(Date.now() + trialDays * 864e5);
      const s = await d.subscription.create({ data: { userId: user.id, planId: plan.id, status: "TRIAL", cycle: data.cycle, renewsAt, provider: "DEMO" } });
      await audit(u.id, "admin.subscription.assign", "Subscription", s.id, { plan: plan.name });
      return ok;
    } catch (e) { rethrow(e); }
  });

const subMoves: Record<string, { from: string[]; to: "PAUSED" | "ACTIVE" | "CANCELLED" }> = {
  pause: { from: ["ACTIVE", "TRIAL"], to: "PAUSED" }, resume: { from: ["PAUSED", "PAST_DUE"], to: "ACTIVE" }, cancel: { from: ["TRIAL", "ACTIVE", "PAST_DUE", "PAUSED"], to: "CANCELLED" },
};
export const setSubscriptionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, action: z.enum(["pause", "resume", "cancel"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("subscriptions.manage"); const m = subMoves[data.action]!;
      const r = await (await db()).subscription.updateMany({ where: { id: data.id, status: { in: m.from as never } }, data: { status: m.to, ...(m.to === "CANCELLED" ? { cancelledAt: new Date() } : {}) } });
      if (!r.count) return fail("This subscription can’t take that action in its current status.");
      await audit(u.id, `admin.subscription.${data.action}`, "Subscription", data.id, { to: m.to });
      return ok;
    } catch (e) { rethrow(e); }
  });

// ---------------- Services ----------------
export type LiveServices = {
  categories: { id: string; name: string; enabled: boolean; commissionPct: number; providers: number; requests: number }[];
  providers: { id: string; name: string; business: string; category: string; categoryId: string; city: string; status: string; verification: string }[];
  requests: { id: string; user: string; category: string; categoryId: string; city: string; status: string; providerId: string | null; provider: string | null; booking: { scheduledFor: string; status: string } | null; createdAt: string }[];
};
export const listServicesFn = createServerFn({ method: "GET" }).handler(async (): Promise<LiveServices> => {
  try {
    await guard("services.manage"); const d = await db();
    const [cats, provs, reqs] = await Promise.all([
      d.serviceCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { providers: true, requests: true } } } }),
      d.serviceProvider.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { category: { select: { name: true } } } }),
      d.serviceRequest.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { name: true } }, category: { select: { name: true } }, provider: { select: { business: true } }, booking: { select: { scheduledFor: true, status: true } } } }),
    ]);
    return {
      categories: cats.map((c) => ({ id: c.id, name: c.name, enabled: c.enabled, commissionPct: Number(c.commissionPct), providers: c._count.providers, requests: c._count.requests })),
      providers: provs.map((p) => ({ id: p.id, name: p.name, business: p.business, category: p.category.name, categoryId: p.categoryId, city: p.city, status: p.status, verification: p.verificationStatus })),
      requests: reqs.map((r) => ({ id: r.id, user: nm(r.user.name), category: r.category.name, categoryId: r.categoryId, city: r.city, status: r.status, providerId: r.providerId, provider: r.provider?.business ?? null, booking: r.booking ? { scheduledFor: r.booking.scheduledFor.toISOString(), status: r.booking.status } : null, createdAt: r.createdAt.toISOString() })),
    };
  } catch (e) { rethrow(e); }
});

export const saveCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, enabled: z.boolean(), commissionPct: z.number().min(0).max(100) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("services.manage");
      const r = await (await db()).serviceCategory.updateMany({ where: { id: data.id }, data: { enabled: data.enabled, commissionPct: data.commissionPct } });
      if (!r.count) return fail("Category not found.");
      await audit(u.id, "admin.serviceCategory.update", "ServiceCategory", data.id, { enabled: data.enabled, commissionPct: data.commissionPct });
      return ok;
    } catch (e) { rethrow(e); }
  });

const provMoves: Record<string, { from: string[]; to: "ACTIVE" | "REJECTED" | "SUSPENDED" }> = {
  approve: { from: ["PENDING"], to: "ACTIVE" }, reject: { from: ["PENDING"], to: "REJECTED" }, suspend: { from: ["ACTIVE"], to: "SUSPENDED" }, restore: { from: ["SUSPENDED", "REJECTED"], to: "ACTIVE" },
};
export const setProviderStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, action: z.enum(["approve", "reject", "suspend", "restore"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("services.manage"); const m = provMoves[data.action]!;
      const r = await (await db()).serviceProvider.updateMany({ where: { id: data.id, status: { in: m.from as never } }, data: { status: m.to } });
      if (!r.count) return fail("This provider can’t take that action in its current status.");
      await audit(u.id, `admin.serviceProvider.${data.action}`, "ServiceProvider", data.id, { to: m.to });
      return ok;
    } catch (e) { rethrow(e); }
  });

/** Assigns an ACTIVE provider from the same category; creates/updates the booking and moves the request to ASSIGNED. */
export const assignServiceRequestFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, providerId: id, scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("services.manage"); const d = await db();
      const err = await d.$transaction(async (tx) => {
        const r = await tx.serviceRequest.findUnique({ where: { id: data.id }, select: { categoryId: true, status: true } });
        if (!r) return "Request not found.";
        if (r.status === "COMPLETED" || r.status === "CANCELLED") return "This request is closed.";
        const p = await tx.serviceProvider.findFirst({ where: { id: data.providerId, status: "ACTIVE", categoryId: r.categoryId }, select: { id: true } });
        if (!p) return "Choose an approved provider from this category.";
        const when = new Date(`${data.scheduledFor}T00:00:00Z`);
        await tx.serviceRequest.update({ where: { id: data.id }, data: { providerId: p.id, status: "ASSIGNED" } });
        await tx.serviceBooking.upsert({ where: { requestId: data.id }, create: { requestId: data.id, providerId: p.id, scheduledFor: when, status: "ASSIGNED" }, update: { providerId: p.id, scheduledFor: when, status: "ASSIGNED" } });
        return null;
      });
      if (err) return fail(err);
      await audit(u.id, "admin.serviceRequest.assign", "ServiceRequest", data.id, { providerId: data.providerId });
      return ok;
    } catch (e) { rethrow(e); }
  });

const reqMoves: Record<string, string[]> = { NEW: ["CANCELLED"], ASSIGNED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
export const setServiceRequestStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("services.manage"); const d = await db();
      const r = await d.serviceRequest.findUnique({ where: { id: data.id }, select: { status: true } });
      if (!r) return fail("Request not found.");
      if (!reqMoves[r.status]?.includes(data.status)) return fail(`A ${r.status.toLowerCase()} request can’t be marked ${data.status.toLowerCase().replace("_", " ")}.`);
      await d.$transaction([
        d.serviceRequest.updateMany({ where: { id: data.id, status: r.status as never }, data: { status: data.status } }),
        d.serviceBooking.updateMany({ where: { requestId: data.id }, data: { status: data.status } }),
      ]);
      await audit(u.id, "admin.serviceRequest.status", "ServiceRequest", data.id, { to: data.status });
      return ok;
    } catch (e) { rethrow(e); }
  });

// ---------------- Analytics (real counts only) ----------------
export type LiveCounts = Record<string, number | Record<string, number>>;
export const liveCountsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await guard("analytics.view"); const d = await db();
    const group = async <T extends string>(rows: Promise<{ _count: { _all: number } }[]>, key: T) => Object.fromEntries((await rows).map((r) => [(r as unknown as Record<T, string>)[key], r._count._all]));
    const [users, properties, visits, enquiries, subscriptions, requests, saved, searches, comparisons, verifications, notifications, paid] = await Promise.all([
      group(d.user.groupBy({ by: ["role"], _count: { _all: true } }) as never, "role"),
      group(d.property.groupBy({ by: ["status"], _count: { _all: true } }) as never, "status"),
      group(d.visit.groupBy({ by: ["status"], _count: { _all: true } }) as never, "status"),
      group(d.enquiry.groupBy({ by: ["status"], _count: { _all: true } }) as never, "status"),
      group(d.subscription.groupBy({ by: ["status"], _count: { _all: true } }) as never, "status"),
      group(d.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } }) as never, "status"),
      d.savedProperty.count(), d.savedSearch.count(), d.comparison.count(), d.verification.count(), d.notification.count(),
      d.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    return { users, properties, visits, enquiries, subscriptions, requests, saved, searches, comparisons, verifications, notifications, paidCount: paid._count._all, paidTotal: paid._sum.amount ?? 0 };
  } catch (e) { rethrow(e); }
});

export type OwnerAnalytics = import("./analytics").OwnerAnalyticsMetrics;

/** Owner-only business snapshot used by the company dashboard. New users/listings are the last 30 days. */
export const ownerAnalyticsFn = createServerFn({ method: "GET" }).handler(async (): Promise<OwnerAnalytics> => {
  try {
    await guard("analytics.view");
    const d = await db();
    const since = new Date(Date.now() - 30 * 864e5);
    const [users, properties, enquiries, visits, messages, newUsers, newListings, rejected, approved] = await Promise.all([
      d.user.groupBy({ by: ["role"], _count: { _all: true } }),
      d.property.groupBy({ by: ["status"], _count: { _all: true } }),
      d.enquiry.count(), d.visit.count(), d.message.count(),
      d.user.count({ where: { createdAt: { gte: since } } }),
      d.property.count({ where: { createdAt: { gte: since } } }),
      d.property.count({ where: { status: "REJECTED" } }),
      d.property.count({ where: { status: { in: ["ACTIVE", "PAUSED", "RENTED", "SOLD", "EXPIRED", "SUSPENDED", "ARCHIVED"] } } }),
    ]);
    const userCounts = Object.fromEntries(users.map(x => [x.role, x._count._all]));
    const propertyCounts = Object.fromEntries(properties.map(x => [x.status, x._count._all]));
    const { ownerAnalyticsMetrics } = await import("./analytics");
    return ownerAnalyticsMetrics({ users: userCounts, properties: propertyCounts, enquiries, visits, messages, newUsers, newListings, approvedListings: approved, rejectedListings: rejected });
  } catch (e) { rethrow(e); }
});

/**
 * Real activity trends: daily counts of records created in the database over the period.
 * No series is projected or fabricated — days without records show zero. View/search
 * events aren't collected server-side, so "saved searches" is the closest search signal.
 */
export type AdminTrends = { series: Record<string, SeriesPoint[]>; verificationStatuses: Record<string, number> };

export const adminTrendsFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }).strict().parse(d))
  .handler(async ({ data }): Promise<AdminTrends> => {
    try {
      await guard("analytics.view");
      const days = data.days;
      const since = new Date(Date.now() - days * 864e5);
      const d = await db();
      const perDay = (rows: { createdAt: Date }[]): SeriesPoint[] => {
        const m = new Map<string, number>();
        for (const r of rows) { const k = r.createdAt.toISOString().slice(0, 10); m.set(k, (m.get(k) ?? 0) + 1); }
        const out: SeriesPoint[] = []; const today = new Date();
        for (let i = days - 1; i >= 0; i--) { const dt = new Date(today); dt.setDate(today.getDate() - i); out.push({ label: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: m.get(dt.toISOString().slice(0, 10)) ?? 0 }); }
        return out;
      };
      const [users, listings, savedSearches, saved, comparisons, visits, enquiries, verifications, reports, subscriptions, payments, requests, verByStatus] = await Promise.all([
        d.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.property.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.savedSearch.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.savedProperty.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.comparison.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.visit.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.enquiry.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.verification.findMany({ where: { submittedAt: { gte: since } }, select: { submittedAt: true } }).then((rows) => rows.map((r) => ({ createdAt: r.submittedAt }))),
        d.report.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.subscription.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.payment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.serviceRequest.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        d.verification.groupBy({ by: ["status"], _count: { _all: true } }),
      ]);
      return {
        series: {
          "New accounts": perDay(users), "New listings": perDay(listings), "Saved searches": perDay(savedSearches), "Saved properties": perDay(saved),
          "Comparisons": perDay(comparisons), "Visit requests": perDay(visits), "Enquiries": perDay(enquiries), "Verification checks": perDay(verifications),
          "Reports": perDay(reports), "Subscriptions": perDay(subscriptions), "Payments": perDay(payments), "Service requests": perDay(requests),
        },
        verificationStatuses: Object.fromEntries(verByStatus.map((v) => [v.status, v._count._all])),
      };
    } catch (e) { rethrow(e); }
  });
