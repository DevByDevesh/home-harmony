/**
 * Server-only: owner visit management, enquiries, notifications and recently viewed.
 * Every query is scoped by the session user id (as requester, or as the listing owner).
 */
import { requireDb } from "../client.server";
import { visitTransitions, type VisitStatus } from "@/lib/visits";

type Db = Awaited<ReturnType<typeof requireDb>>;
type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];

export async function notify(db: Db | Tx, userId: string, type: string, title: string, message: string, metadata: Record<string, string>) {
  await db.notification.create({ data: { userId, type, title, message, metadata } });
}

const day = (d: Date) => d.toISOString().slice(0, 10);

// ---- Visits ----

export async function notifyVisitRequested(visitId: string) {
  const db = await requireDb();
  const v = await db.visit.findUnique({ where: { id: visitId }, select: { requestedDate: true, requestedTime: true, property: { select: { ownerId: true, title: true, slug: true } } } });
  if (!v) return;
  await notify(db, v.property.ownerId, "VISIT_REQUESTED", "New visit request", `${v.property.title} · ${day(v.requestedDate)} at ${v.requestedTime}`, { visitId, slug: v.property.slug });
}

export async function notifyVisitCancelled(visitId: string) {
  const db = await requireDb();
  const v = await db.visit.findUnique({ where: { id: visitId }, select: { status: true, property: { select: { ownerId: true, title: true, slug: true } } } });
  if (!v || v.status !== "CANCELLED") return;
  await notify(db, v.property.ownerId, "VISIT_CANCELLED", "Visit cancelled by visitor", v.property.title, { visitId, slug: v.property.slug });
}

export async function listOwnerVisits(ownerId: string) {
  const db = await requireDb();
  return db.visit.findMany({
    where: { property: { ownerId } }, orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, requestedDate: true, requestedTime: true, notes: true, status: true, createdAt: true, user: { select: { name: true } }, property: { select: { slug: true, title: true } } },
  });
}

/** Owner-only status change. Returns an error message, or null on success. */
export async function ownerUpdateVisit(ownerId: string, id: string, to: VisitStatus, date?: string, time?: string): Promise<string | null> {
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const v = await tx.visit.findFirst({ where: { id, property: { ownerId } }, select: { status: true, userId: true, property: { select: { title: true, slug: true } } } });
    if (!v) return "Visit not found for your listings.";
    if (!visitTransitions[v.status].includes(to)) return `A ${v.status.toLowerCase()} visit can’t be marked ${to.toLowerCase()}.`;
    if (to === "RESCHEDULED" && (!date || !time)) return "Choose a new date and time.";
    const upd = await tx.visit.updateMany({
      where: { id, status: v.status },
      data: { status: to, handlerId: ownerId, ...(to === "CONFIRMED" ? { confirmedAt: new Date() } : {}), ...(to === "RESCHEDULED" ? { requestedDate: new Date(`${date}T00:00:00Z`), requestedTime: time! } : {}) },
    });
    if (!upd.count) return "This visit changed meanwhile. Refresh and try again.";
    const label = { CONFIRMED: "Visit confirmed", RESCHEDULED: "Visit rescheduled", COMPLETED: "Visit marked completed", CANCELLED: "Visit declined", REQUESTED: "Visit updated" }[to];
    await notify(tx, v.userId, `VISIT_${to}`, label, to === "RESCHEDULED" ? `${v.property.title} · new time ${date} at ${time}` : v.property.title, { visitId: id, slug: v.property.slug });
    return null;
  });
}

// ---- Enquiries ----

export async function createEnquiry(userId: string, slug: string, message: string) {
  const db = await requireDb();
  const p = await db.property.findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true, ownerId: true, agentId: true, title: true } });
  if (!p) return null;
  if (p.ownerId === userId) return "own" as const;
  return db.$transaction(async (tx) => {
    const e = await tx.enquiry.create({ data: { userId, propertyId: p.id, handlerId: p.agentId ?? p.ownerId, message, status: "NEW" }, select: { id: true } });
    await notify(tx, p.ownerId, "ENQUIRY_RECEIVED", "New enquiry", p.title, { enquiryId: e.id, slug });
    if (p.agentId && p.agentId !== p.ownerId) await notify(tx, p.agentId, "LEAD_ASSIGNED", "New lead assigned", p.title, { enquiryId: e.id, slug });
    await notify(tx, userId, "ENQUIRY_SENT", "Enquiry sent", p.title, { enquiryId: e.id, slug });
    return e;
  });
}

const enquirySelect = { id: true, message: true, status: true, createdAt: true, property: { select: { slug: true, title: true } } } as const;
export async function listMyEnquiries(userId: string) {
  const db = await requireDb();
  return db.enquiry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200, select: enquirySelect });
}
export async function listOwnerEnquiries(ownerId: string) {
  const db = await requireDb();
  return db.enquiry.findMany({ where: { property: { ownerId } }, orderBy: { createdAt: "desc" }, take: 200, select: { ...enquirySelect, user: { select: { name: true } } } });
}

// ---- Notifications ----

export async function listMyNotifications(userId: string) {
  const db = await requireDb();
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, type: true, title: true, message: true, readAt: true, createdAt: true } });
}

// ---- Recently viewed (stored in SearchPreference.extra.recent; no schema change) ----

export async function getRecent(userId: string): Promise<string[]> {
  const db = await requireDb();
  const p = await db.searchPreference.findUnique({ where: { userId }, select: { extra: true } });
  const r = (p?.extra as { recent?: unknown } | null)?.recent;
  return Array.isArray(r) ? r.filter((x): x is string => typeof x === "string") : [];
}
export async function setRecent(userId: string, slugs: string[]) {
  const db = await requireDb();
  const cur = await db.searchPreference.findUnique({ where: { userId }, select: { extra: true } });
  const extra = { ...((cur?.extra as Record<string, unknown> | null) ?? {}), recent: slugs };
  await db.searchPreference.upsert({ where: { userId }, create: { userId, extra }, update: { extra } });
}
