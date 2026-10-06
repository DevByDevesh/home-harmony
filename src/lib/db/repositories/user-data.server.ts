/** Server-only repository for seeker data. Mirrors src/lib/user-data.ts (device-local demo). */
import { requireDb } from "../client.server";
import { COMPARE_LIMIT } from "@/lib/compare";

export async function saveProperty(userId: string, propertyId: string) {
  const db = await requireDb();
  return db.savedProperty.upsert({ where: { userId_propertyId: { userId, propertyId } }, create: { userId, propertyId }, update: {} });
}

export async function unsaveProperty(userId: string, propertyId: string) {
  const db = await requireDb();
  await db.savedProperty.deleteMany({ where: { userId, propertyId } });
}

/** Neutral comparison: stores order only, never a ranking. */
export async function createComparison(userId: string, propertyIds: string[]) {
  if (propertyIds.length > COMPARE_LIMIT) throw new Error(`A comparison holds at most ${COMPARE_LIMIT} properties.`);
  const db = await requireDb();
  return db.comparison.create({ data: { userId, properties: { create: propertyIds.map((propertyId, position) => ({ propertyId, position })) } } });
}

/** Legacy visit entry point kept for compatibility with older callers. */
export async function requestVisit(input: { userId: string; propertyId: string; date: string; time: string; notes?: string }) {
  const db = await requireDb();
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(input.date) || !/^\\d{2}:\\d{2}$/.test(input.time)) return null;
  const requestedDate = new Date(input.date + "T00:00:00Z");
  if (Number.isNaN(requestedDate.getTime())) return null;
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (requestedDate < todayUtc) return null;

  const [property, user] = await Promise.all([
    db.property.findFirst({ where: { id: input.propertyId, status: "ACTIVE" }, select: { ownerId: true, agentId: true } }),
    db.user.findUnique({ where: { id: input.userId }, select: { status: true } }),
  ]);
  if (!property || !user || user.status === "SUSPENDED" || user.status === "DEACTIVATED") return null;
  if (property.ownerId === input.userId) return null;

  return db.visit.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId,
      handlerId: property.agentId ?? property.ownerId,
      requestedDate,
      requestedTime: input.time,
      notes: input.notes?.trim().slice(0, 500) || null,
      status: "REQUESTED",
    },
  });
}

// ---- Phase: seeker data backed by PostgreSQL. Every query is scoped by userId. ----

/** Resolves public (ACTIVE) listing slugs to ids. Unknown or non-live slugs are dropped. */
export async function resolveSlugs(slugs: string[]) {
  const db = await requireDb();
  const rows = await db.property.findMany({ where: { slug: { in: slugs }, status: "ACTIVE" }, select: { id: true, slug: true } });
  return new Map(rows.map((r) => [r.slug, r.id]));
}

export async function getUserDataSnapshot(userId: string) {
  const db = await requireDb();
  const [saved, comparison, searches, visits] = await Promise.all([
    db.savedProperty.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { property: { select: { slug: true } } } }),
    db.comparison.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { properties: { orderBy: { position: "asc" }, select: { property: { select: { slug: true } } } } } }),
    db.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    db.visit.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true, requestedDate: true, requestedTime: true, notes: true, status: true, createdAt: true, property: { select: { slug: true } } } }),
  ]);
  return { saved, comparison, searches, visits };
}

/** Replaces the user's single working comparison (order only, no ranking). Max COMPARE_LIMIT, no duplicates. */
export async function setUserComparison(userId: string, propertyIds: string[]) {
  const ids = [...new Set(propertyIds)];
  if (ids.length > COMPARE_LIMIT) throw new Error(`A comparison holds at most ${COMPARE_LIMIT} properties.`);
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const cur = await tx.comparison.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { id: true } });
    const compId = cur?.id ?? (await tx.comparison.create({ data: { userId }, select: { id: true } })).id;
    await tx.comparisonProperty.deleteMany({ where: { comparisonId: compId } });
    if (ids.length) await tx.comparisonProperty.createMany({ data: ids.map((propertyId, position) => ({ comparisonId: compId, propertyId, position })) });
    await tx.comparison.update({ where: { id: compId }, data: { updatedAt: new Date() } });
  });
}

export type SearchInput = { id: string; name: string; criteria: object; alertEnabled: boolean; alertFrequency: "INSTANT" | "DAILY" | "WEEKLY"; alertTypes: string[] };

/** Creates or updates a saved search. Update only matches the caller's own row; returns false if the id belongs to someone else. */
export async function upsertUserSearch(userId: string, s: SearchInput) {
  const db = await requireDb();
  const data = { name: s.name, criteria: s.criteria, alertEnabled: s.alertEnabled, alertFrequency: s.alertFrequency, alertTypes: s.alertTypes };
  const upd = await db.savedSearch.updateMany({ where: { id: s.id, userId }, data });
  if (upd.count) return true;
  if (await db.savedSearch.findUnique({ where: { id: s.id }, select: { id: true } })) return false;
  await db.savedSearch.create({ data: { id: s.id, userId, ...data } });
  return true;
}

export async function deleteUserSearch(userId: string, id: string) {
  const db = await requireDb();
  return (await db.savedSearch.deleteMany({ where: { id, userId } })).count;
}

/** Creates a visit request for a live listing. Always starts REQUESTED. */
export async function createUserVisit(input: { id: string; userId: string; propertyId: string; date: string; time: string; notes: string | null }) {
  const db = await requireDb();
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(input.date) || !/^\\d{2}:\\d{2}$/.test(input.time)) return null;
  const requestedDate = new Date(input.date + "T00:00:00Z");
  if (Number.isNaN(requestedDate.getTime())) return null;
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (requestedDate < todayUtc) return null;

  const [property, user] = await Promise.all([
    db.property.findFirst({
      where: { id: input.propertyId, status: "ACTIVE" },
      select: { ownerId: true, agentId: true },
    }),
    db.user.findUnique({ where: { id: input.userId }, select: { status: true } }),
  ]);

  if (!property || !user || user.status === "SUSPENDED" || user.status === "DEACTIVATED") return null;
  if (property.ownerId === input.userId) return null;

  return db.visit.create({
    data: {
      id: input.id,
      userId: input.userId,
      propertyId: input.propertyId,
      handlerId: property.agentId ?? property.ownerId,
      requestedDate,
      requestedTime: input.time,
      notes: input.notes,
      status: "REQUESTED",
    },
  });
}

/** Seeker may only cancel their own, not-yet-finished visit. */
export async function cancelUserVisit(userId: string, id: string) {
  const db = await requireDb();
  return (await db.visit.updateMany({ where: { id, userId, status: { in: ["REQUESTED", "CONFIRMED", "RESCHEDULED"] } }, data: { status: "CANCELLED" } })).count;
}
