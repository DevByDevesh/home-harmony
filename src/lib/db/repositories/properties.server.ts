/**
 * Database-backed property repository (server-only). Not wired into the UI yet —
 * the demo catalog in src/lib/catalog.ts remains the live source until a later phase.
 */
import type { Prisma } from "@prisma/client";
import { requireDb } from "../client.server";

export type PropertySearch = { city?: string; listingType?: "RENT" | "BUY"; propertyType?: Prisma.PropertyWhereInput["propertyType"]; maxPrice?: number; take?: number };

export async function listPublicProperties(q: PropertySearch = {}) {
  const db = await requireDb();
  return db.property.findMany({
    where: { status: "ACTIVE", city: q.city, listingType: q.listingType, propertyType: q.propertyType, price: q.maxPrice ? { lte: q.maxPrice } : undefined },
    include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(q.take ?? 24, 100),
  });
}

export async function getPropertyBySlug(slug: string) {
  const db = await requireDb();
  return db.property.findUnique({ where: { slug }, include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } } } });
}

/** Approval changes listing status only; verification status is never touched here. */
export async function approveListing(propertyId: string, actorId: string) {
  const db = await requireDb();
  return db.$transaction([
    db.property.update({ where: { id: propertyId }, data: { status: "ACTIVE", publishedAt: new Date() } }),
    db.auditLog.create({ data: { actorId, action: "Listing approved", entityType: "Property", entityId: propertyId } }),
  ]);
}
