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

export async function requestVisit(input: { userId: string; propertyId: string; date: string; time: string; notes?: string }) {
  const db = await requireDb();
  const property = await db.property.findUniqueOrThrow({ where: { id: input.propertyId }, select: { ownerId: true, agentId: true } });
  return db.visit.create({ data: { userId: input.userId, propertyId: input.propertyId, handlerId: property.agentId ?? property.ownerId, requestedDate: new Date(input.date), requestedTime: input.time, notes: input.notes ?? null } });
}
