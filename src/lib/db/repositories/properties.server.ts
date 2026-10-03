/**
 * Database-backed property repository (server-only). Not wired into the UI yet —
 * the demo catalog in src/lib/catalog.ts remains the live source until a later phase.
 */
import type { PropertyType, VerificationType } from "@prisma/client";
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

export type NewOwnerProperty = {
  title: string; description: string; propertyType: PropertyType; listingType: "RENT" | "BUY";
  price: number; deposit: number | null; areaSqft: number; bedrooms: number; bathrooms: number; parking: number;
  furnishing: "FULLY_FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED"; availableFrom: Date | null;
  city: string; locality: string; addressLine1: string | null; amenities: string[]; photoKeys: string[];
  /** Verification checks requested (always PENDING; never decided here). */
  checks: VerificationType[];
};

const WIZARD_PHOTO_PREFIX = "demo/new-home-";

/** Creates an owner listing. Status is always UNDER_REVIEW; checks are only requested (PENDING) — never approved here. */
async function autoVerifyOwnerListing(
  tx: any,
  propertyId: string,
  ownerId: string,
  p: NewOwnerProperty,
  propCreatedAt: Date,
) {
  const now = new Date();
  const checks = new Set(p.checks);

  const autoVerified = new Set<VerificationType>();

  if (checks.has("PROPERTY") && p.title.trim() && p.description.trim() && p.price > 0 && p.areaSqft > 0) {
    autoVerified.add("PROPERTY");
  }

  if (checks.has("PHOTOS") && p.photoKeys.length > 0) {
    autoVerified.add("PHOTOS");
  }

  if (checks.has("LOCATION") && p.city.trim() && p.locality.trim() && p.addressLine1?.trim()) {
    autoVerified.add("LOCATION");
  }

  if (checks.has("AVAILABILITY") && p.availableFrom instanceof Date && !Number.isNaN(p.availableFrom.getTime())) {
    autoVerified.add("AVAILABILITY");
  }

  const owner = await tx.user.findUnique({
    where: { id: ownerId },
    select: { phoneVerified: true },
  });

  if (checks.has("PHONE") && owner?.phoneVerified) {
    autoVerified.add("PHONE");
  }

  for (const type of checks) {
    const verified = autoVerified.has(type);
    await tx.verification.create({
      data: {
        type,
        status: verified ? "VERIFIED" : "PENDING",
        userId: ownerId,
        propertyId,
        decidedAt: verified ? now : null,
      },
    });
  }

  const pending = [...checks].some((type) => !autoVerified.has(type));

  await tx.property.update({
    where: { id: propertyId },
    data: {
      verificationStatus: pending ? "PENDING" : "VERIFIED",
    },
  });

  return { autoVerified: [...autoVerified], pending };
}
export async function createOwnerProperty(ownerId: string, p: NewOwnerProperty) {
  const db = await requireDb();
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${slugify(`${p.bedrooms}bhk ${p.propertyType} ${p.locality} ${p.city}`)}-${crypto.randomUUID().slice(0, 8)}`;
  return db.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        slug, title: p.title, description: p.description, propertyType: p.propertyType, listingType: p.listingType,
        price: p.price, deposit: p.deposit, areaSqft: p.areaSqft, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking,
        furnishing: p.furnishing, availableFrom: p.availableFrom, city: p.city, locality: p.locality, addressLine1: p.addressLine1,
        status: "UNDER_REVIEW", verificationStatus: p.checks.length ? "PENDING" : "NOT_REQUESTED", ownerId,
        images: { create: p.photoKeys.map((storageKey, i) => ({ storageKey, altText: `${p.title} (owner-selected illustrative photo)`, sortOrder: i })) },
      },
    });
    for (const name of p.amenities) {
      const a = await tx.amenity.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name) } });
      await tx.propertyAmenity.create({ data: { propertyId: prop.id, amenityId: a.id } });
    }
    await autoVerifyOwnerListing(tx, prop.id, ownerId, p, prop.createdAt);
    return prop;
  });
}

/** Loads a listing for editing — only when owned by `ownerId`. Includes the private address for the owner only. */
export async function getOwnerPropertyForEdit(id: string, ownerId: string) {
  const db = await requireDb();
  return db.property.findFirst({
    where: { id, ownerId },
    include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } }, verifications: { select: { type: true } } },
  });
}

/**
 * Updates an owner's listing in place (never creates). Returns null when not owned.
 * Edits go back to UNDER_REVIEW (never ACTIVE). Existing verification records are
 * never changed or removed; newly selected checks are added as PENDING.
 */
export async function updateOwnerProperty(id: string, ownerId: string, p: NewOwnerProperty) {
  const db = await requireDb();
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return db.$transaction(async (tx) => {
    const cur = await tx.property.findFirst({ where: { id, ownerId }, include: { verifications: { select: { type: true } } } });
    if (!cur) return null;
    const have = new Set(cur.verifications.map((v) => v.type));
    const add = [...new Set(p.checks)].filter((t) => !have.has(t));
    await tx.property.update({
      where: { id },
      data: {
        title: p.title, description: p.description, propertyType: p.propertyType, listingType: p.listingType,
        price: p.price, deposit: p.deposit, areaSqft: p.areaSqft, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking,
        furnishing: p.furnishing, availableFrom: p.availableFrom, city: p.city, locality: p.locality, addressLine1: p.addressLine1,
        status: cur.status === "ARCHIVED" ? cur.status : "UNDER_REVIEW",
        ...(add.length && cur.verificationStatus === "NOT_REQUESTED" ? { verificationStatus: "PENDING" as const } : {}),
      },
    });
    await tx.propertyImage.deleteMany({ where: { propertyId: id, storageKey: { startsWith: WIZARD_PHOTO_PREFIX } } });
    for (const [i, storageKey] of p.photoKeys.entries()) await tx.propertyImage.create({ data: { propertyId: id, storageKey, altText: `${p.title} (owner-selected illustrative photo)`, sortOrder: i } });
    await tx.propertyAmenity.deleteMany({ where: { propertyId: id } });
    for (const name of p.amenities) {
      const a = await tx.amenity.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name) } });
      await tx.propertyAmenity.create({ data: { propertyId: id, amenityId: a.id } });
    }
    for (const type of add) await tx.verification.create({ data: { type, status: "PENDING", userId: ownerId, propertyId: id } });
    return { id, added: add };
  });
}
