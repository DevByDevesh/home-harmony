/**
 * Admin live data: properties, enquiries and visits from PostgreSQL.
 * Every call re-checks the admin permission on the server and audits changes.
 * Only fields admins already see are returned (names, listing facts, statuses) — no passwords, tokens or message bodies.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { VisitStatus } from "./visits";

function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }
async function guard(p: "listings.moderate" | "enquiries.manage" | "visits.manage") { const { requirePermission } = await import("./auth/guards.server"); return requirePermission(p); }
async function db() { const { requireDb } = await import("./db/client.server"); return requireDb(); }
async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, string>) { const { writeAudit } = await import("./auth/audit.server"); await writeAudit({ actorId, action, entityType, entityId, metadata }); }
const id = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const first = (n: string) => n || "—";

export type AdminLiveProperty = { id: string; slug: string; title: string; city: string; locality: string; price: number; listingType: string; status: string; verification: string; owner: string; updatedAt: string };
export type AdminLiveEnquiry = { id: string; seeker: string; property: string; handler: string; status: string; createdAt: string; lastActivityAt: string };
export type AdminLiveVisit = { id: string; visitor: string; property: string; handler: string; date: string; slot: string; status: VisitStatus };

export const adminListPropertiesFn = createServerFn({ method: "GET" }).handler(async (): Promise<AdminLiveProperty[]> => {
  try {
    await guard("listings.moderate");
    const rows = await (await db()).property.findMany({ orderBy: { updatedAt: "desc" }, take: 300, select: { id: true, slug: true, title: true, city: true, locality: true, price: true, listingType: true, status: true, verificationStatus: true, updatedAt: true, owner: { select: { name: true } } } });
    return rows.map((p) => ({ id: p.id, slug: p.slug, title: p.title, city: p.city, locality: p.locality, price: Number(p.price), listingType: p.listingType, status: p.status, verification: p.verificationStatus, owner: first(p.owner.name), updatedAt: p.updatedAt.toISOString() }));
  } catch (e) { rethrow(e); }
});

/** Moderation transitions. Approval makes a listing live; it never sets verification. */
const propMoves: Record<string, { from: string[]; to: "ACTIVE" | "PAUSED" | "ARCHIVED" | "UNDER_REVIEW" }> = {
  approve: { from: ["UNDER_REVIEW"], to: "ACTIVE" }, reject: { from: ["UNDER_REVIEW"], to: "ARCHIVED" },
  pause: { from: ["ACTIVE"], to: "PAUSED" }, resume: { from: ["PAUSED"], to: "ACTIVE" },
  archive: { from: ["ACTIVE", "PAUSED", "UNDER_REVIEW", "RENTED", "SOLD", "EXPIRED"], to: "ARCHIVED" }, restore: { from: ["ARCHIVED"], to: "UNDER_REVIEW" },
};
export const adminPropertyActionFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, action: z.enum(["approve", "reject", "pause", "resume", "archive", "restore"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("listings.moderate"); const m = propMoves[data.action]!;
      const r = await (await db()).property.updateMany({ where: { id: data.id, status: { in: m.from as never } }, data: { status: m.to, ...(m.to === "ACTIVE" && data.action === "approve" ? { publishedAt: new Date() } : {}) } });
      if (!r.count) return { ok: false as const, message: "This listing can’t take that action in its current status." };
      await audit(u.id, `admin.property.${data.action}`, "Property", data.id, { to: m.to });
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

export const adminListEnquiriesFn = createServerFn({ method: "GET" }).handler(async (): Promise<AdminLiveEnquiry[]> => {
  try {
    await guard("enquiries.manage");
    const rows = await (await db()).enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 300, select: { id: true, status: true, createdAt: true, lastActivityAt: true, user: { select: { name: true } }, handler: { select: { name: true } }, property: { select: { title: true } } } });
    return rows.map((e) => ({ id: e.id, seeker: first(e.user.name), property: e.property.title, handler: first(e.handler?.name ?? ""), status: e.status, createdAt: e.createdAt.toISOString(), lastActivityAt: e.lastActivityAt.toISOString() }));
  } catch (e) { rethrow(e); }
});

export const adminSetEnquiryStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, status: z.enum(["NEW", "CONTACTED", "IN_PROGRESS", "RESOLVED", "CLOSED"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("enquiries.manage");
      const r = await (await db()).enquiry.updateMany({ where: { id: data.id }, data: { status: data.status, lastActivityAt: new Date() } });
      if (!r.count) return { ok: false as const, message: "Enquiry not found." };
      await audit(u.id, "admin.enquiry.status", "Enquiry", data.id, { to: data.status });
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

export const adminListVisitsFn = createServerFn({ method: "GET" }).handler(async (): Promise<AdminLiveVisit[]> => {
  try {
    await guard("visits.manage");
    const rows = await (await db()).visit.findMany({ orderBy: { createdAt: "desc" }, take: 300, select: { id: true, requestedDate: true, requestedTime: true, status: true, user: { select: { name: true } }, handler: { select: { name: true } }, property: { select: { title: true } } } });
    return rows.map((v) => ({ id: v.id, visitor: first(v.user.name), property: v.property.title, handler: first(v.handler?.name ?? ""), date: v.requestedDate.toISOString().slice(0, 10), slot: v.requestedTime, status: v.status }));
  } catch (e) { rethrow(e); }
});

export const adminSetVisitStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("visits.manage");
      const { visitTransitions } = await import("./visits");
      const d = await db();
      const v = await d.visit.findUnique({ where: { id: data.id }, select: { status: true } });
      if (!v) return { ok: false as const, message: "Visit not found." };
      if (!visitTransitions[v.status].includes(data.status)) return { ok: false as const, message: "That change isn’t allowed for this visit." };
      await d.visit.updateMany({ where: { id: data.id, status: v.status }, data: { status: data.status, ...(data.status === "CONFIRMED" ? { confirmedAt: new Date() } : {}) } });
      await audit(u.id, "admin.visit.status", "Visit", data.id, { to: data.status });
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });
