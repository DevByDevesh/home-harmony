/**
 * Database-backed property repository (server-only). Not wired into the UI yet —
 * the demo catalog in src/lib/catalog.ts remains the live source until a later phase.
 */
import type { PropertyType } from "@prisma/client";
import { requireDb } from "../client.server";

export type PropertySearch = { city?: string; listingType?: "RENT" | "BUY"; propertyType?: PropertyType; maxPrice?: number; take?: number };

export async function listPublicProperties(q: PropertySearch = {}) {
  const db = await requireDb();
  return db.property.findMany({
    where: {
      status: "ACTIVE",
      ...(q.city ? { city: q.city } : {}),
      ...(q.listingType ? { listingType: q.listingType } : {}),
      ...(q.propertyType ? { propertyType: q.propertyType } : {}),
      ...(q.maxPrice ? { price: { lte: q.maxPrice } } : {}),
    },
    include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: Math.min(q.take ?? 24, 100),
  });
}

export async function getPropertyBySlug(slug: string) {
  const db = await requireDb();
  return db.property.findUnique({ where: { slug }, include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } } });
}

/** Public detail read: ACTIVE listings only, matched by id or slug. */
export async function getPublicProperty(idOrSlug: string) {
  const db = await requireDb();
  return db.property.findFirst({
    where: { status: "ACTIVE", OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } },
  });
}

/** Approval changes listing status only; verification status is never touched here. */
export async function approveListing(propertyId: string, actorId: string) {
  const db = await requireDb();
  return db.$transaction([
    db.property.update({ where: { id: propertyId }, data: { status: "ACTIVE", publishedAt: new Date() } }),
    db.auditLog.create({ data: { actorId, action: "Listing approved", entityType: "Property", entityId: propertyId } }),
  ]);
}

/** Owner-scoped read: only listings owned by `ownerId`, any status. */
export async function listOwnerProperties(ownerId: string) {
  const db = await requireDb();
  return db.property.findMany({
    where: { ownerId },
    include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/**
 * Pause/resume guarded by ownership in the WHERE clause itself, so another
 * owner's id can never match. Resume only from PAUSED (never bypasses review).
 * Returns the number of rows changed (0 = not yours or not allowed).
 */
export async function setOwnerPropertyStatus(id: string, ownerId: string, to: "ACTIVE" | "PAUSED") {
  const db = await requireDb();
  const from = to === "PAUSED" ? "ACTIVE" : "PAUSED";
  const r = await db.property.updateMany({ where: { id, ownerId, status: from }, data: { status: to } });
  return r.count;
}
