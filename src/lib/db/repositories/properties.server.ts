/**
 * Database-backed property repository (server-only). Public reads use this repository
 * when DATABASE_URL is configured; otherwise the typed demo catalog is used as fallback.
 */
import { Prisma, PropertyStatus, type PropertyType, type VerificationType } from "@prisma/client";
import { requireDb } from "../client.server";

export type PropertySearch = { city?: string; listingType?: "RENT" | "BUY"; propertyType?: PropertyType; minPrice?: number; maxPrice?: number; take?: number };
export const LISTING_VALIDITY_DAYS = 30;
export const LISTING_REPOST_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const LISTING_VALIDITY_MS = LISTING_VALIDITY_DAYS * DAY_MS;
const LISTING_REPOST_WINDOW_MS = LISTING_REPOST_WINDOW_DAYS * DAY_MS;

/** Marks active listings expired once their publication window reaches 30 days. */
export async function expireListings() {
  const db = await requireDb();
  const cutoff = new Date(Date.now() - LISTING_VALIDITY_MS);
  return db.property.updateMany({ where: { status: "ACTIVE", publishedAt: { not: null, lte: cutoff } }, data: { status: "EXPIRED" } });
}

/**
 * Permanently removes expired listings whose 7-day repost window has elapsed.
 * Listing-specific interactions are removed with the listing; audit history is
 * retained separately so the deletion remains traceable.
 */
export async function purgeExpiredListings() {
  const db = await requireDb();
  const cutoff = new Date(Date.now() - (LISTING_VALIDITY_MS + LISTING_REPOST_WINDOW_MS));

  return db.$transaction(async (tx) => {
    const expired = await tx.property.findMany({
      where: {
        status: "EXPIRED",
        publishedAt: { not: null, lte: cutoff },
      },
      select: { id: true, ownerId: true, publishedAt: true },
    });

    for (const property of expired) {
      await tx.enquiry.deleteMany({ where: { propertyId: property.id } });
      await tx.visit.deleteMany({ where: { propertyId: property.id } });
      await tx.propertyReview.deleteMany({ where: { propertyId: property.id } });
      await tx.savedProperty.deleteMany({ where: { propertyId: property.id } });
      await tx.comparisonProperty.deleteMany({ where: { propertyId: property.id } });
      await tx.verification.deleteMany({ where: { propertyId: property.id } });
      await tx.report.updateMany({ where: { propertyId: property.id }, data: { propertyId: null } });
      await tx.serviceRequest.updateMany({ where: { propertyId: property.id }, data: { propertyId: null } });
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "Listing permanently deleted after repost window",
          entityType: "Property",
          entityId: property.id,
          metadata: {
            reason: "REPOST_WINDOW_EXPIRED",
            repostWindowDays: LISTING_REPOST_WINDOW_DAYS,
            expiredAt: property.publishedAt,
          },
        },
      });
      await tx.property.delete({ where: { id: property.id } });
    }

    return { count: expired.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}


export async function listPublicProperties(q: PropertySearch = {}) {
  const db = await requireDb();
  await expireListings();
  return db.property.findMany({
    where: {
      status: "ACTIVE",
      ...(q.city ? { city: q.city } : {}),
      ...(q.listingType ? { listingType: q.listingType } : {}),
      ...(q.propertyType ? { propertyType: q.propertyType } : {}),
      ...((q.minPrice !== undefined || q.maxPrice !== undefined)
        ? { price: { ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}), ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}) } }
        : {}),
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
  await expireListings();
  return db.property.findFirst({
    where: { status: "ACTIVE", OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { images: { orderBy: { sortOrder: "asc" } }, amenities: { include: { amenity: true } }, owner: { select: { ownerProfile: { select: { contactPhone: true, preferredContact: true } } } } },
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
  await expireListings();
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
/** Owner-scoped soft delete/archive. History is preserved for listings with activity. */
export async function setOwnerPropertyArchived(id: string, ownerId: string, archived: boolean) {
  const db = await requireDb();
  const r = await db.property.updateMany({
    where: { id, ownerId, status: archived ? { not: "ARCHIVED" } : "ARCHIVED" },
    data: { status: archived ? "ARCHIVED" : "UNDER_REVIEW", ...(archived ? {} : { publishedAt: null }) },
  });
  return r.count;
}

/** Reposts an expired listing without creating a new property record. Details/images/history are preserved; verification is reset for a fresh review. */
export async function repostExpiredOwnerProperty(id: string, ownerId: string) {
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const current = await tx.property.findFirst({
      where: { id, ownerId, status: "EXPIRED" },
      select: { id: true },
    });
    if (!current) return null;

    await tx.property.update({
      where: { id },
      data: {
        status: "UNDER_REVIEW",
        publishedAt: null,
        verificationStatus: "PENDING",
      },
    });

    await tx.verification.updateMany({
      where: { propertyId: id },
      data: { status: "PENDING", decidedAt: null, reviewerId: null, submittedAt: new Date() },
    });

    return current;
  });
}

export async function setOwnerPropertyStatus(id: string, ownerId: string, to: "ACTIVE" | "PAUSED") {
  const db = await requireDb();
  const from: Prisma.PropertyWhereInput["status"] = to === "ACTIVE" ? { in: [PropertyStatus.PAUSED] } : { in: [PropertyStatus.ACTIVE] };
  const r = await db.property.updateMany({ where: { id, ownerId, status: from }, data: to === "ACTIVE" ? { status: to, publishedAt: new Date() } : { status: to } });
  return r.count;
}

export type NewOwnerProperty = {
  title: string; description: string; propertyType: PropertyType; listingType: "RENT" | "BUY";
  price: number; deposit: number | null; areaSqft: number; bedrooms: number; bathrooms: number; parking: number;
  propertyAgeYears?: number | null; floor?: number | null; totalFloors?: number | null;
  furnishing: "FULLY_FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED"; availableFrom: Date | null;
  country: string; state: string; city: string; locality: string; addressLine1: string | null; amenities: string[]; photoKeys: string[];
  /** Verification checks requested (always PENDING; never decided here). */
  checks: VerificationType[];
};

const WIZARD_PHOTO_PREFIX = "demo/new-home-";

/** Creates an owner listing. Status is always UNDER_REVIEW; checks are only requested (PENDING) — never approved here. */
async function autoVerifyOwnerListing(
  tx: Prisma.TransactionClient,
  propertyId: string,
  ownerId: string,
  p: NewOwnerProperty,
  propCreatedAt: Date,
) {
  const now = new Date();
  const checks = new Set(p.checks);

  // Structural completeness is not real-world verification. Property, photo,
  // location and availability checks always require actual review/evidence.
  // A phone check may only be marked verified when auth has recorded a
  // genuine phone verification event.
  const autoVerified = new Set<VerificationType>();
  const owner = await tx.user.findUnique({
    where: { id: ownerId },
    select: { phoneVerified: true },
  });

  if (checks.has("PHONE") && owner?.phoneVerified) autoVerified.add("PHONE");

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

  // Never promote a listing to VERIFIED merely because submitted fields look complete.
  await tx.property.update({
    where: { id: propertyId },
    data: { verificationStatus: checks.size ? "PENDING" : "NOT_REQUESTED" },
  });

  return { autoVerified: [...autoVerified], pending: checks.size > autoVerified.size };
}
/**
 * Automatically reviews a submitted listing using deterministic marketplace safety rules.
 * This is a structural/content gate, not proof of ownership, address or real-world availability.
 * Listings that pass are published immediately; anything incomplete stays UNDER_REVIEW.
 */
export async function autoReviewAndPublishListing(propertyId: string) {
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        owner: { select: { status: true, emailVerified: true } },
      },
    });

    if (!property || property.status !== "UNDER_REVIEW") {
      return { published: false, reason: "NOT_REVIEWABLE" as const };
    }

    const issues: string[] = [];
    const text = `${property.title} ${property.description}`.toLowerCase();
    const description = property.description.toLowerCase();

    if (property.title.trim().length < 5) issues.push("title_too_short");
    if (property.description.trim().length < 30) issues.push("description_too_short");
    if (property.price <= 0) issues.push("invalid_price");
    if (property.areaSqft < 50) issues.push("invalid_area");
    if (!property.city.trim()) issues.push("missing_city");
    if (!(property.state ?? "").trim()) issues.push("missing_state");
    if (!property.locality.trim()) issues.push("missing_locality");
    if (!property.addressLine1?.trim()) issues.push("missing_address");
    if (!property.images.length) issues.push("missing_photos");
    if (property.owner.status !== "ACTIVE") issues.push("owner_not_active");
    if (!property.owner.emailVerified) issues.push("owner_email_not_verified");

    // Free, deterministic marketplace-safety rules.
    const scamPatterns = [
      /pay\\s+(?:now|first|advance|deposit)\\b/i,
      /send\\s+(?:money|payment|upi)\\b/i,
      /upi\\s*(?:id|payment)/i,
      /bank\\s+(?:transfer|details|account)/i,
      /registration\\s+fee/i,
      /processing\\s+fee/i,
      /security\\s+deposit\\s+before/i,
      /guaranteed\\s+(?:deal|rent|approval)/i,
      /urgent(?:ly)?\\s+(?:pay|transfer|book)/i,
      /whatsapp\\s+(?:only|me)/i,
      /telegram\\s+(?:only|me)/i,
      /no\\s+visit/i,
    ];
    const matchedScamPatterns = scamPatterns.filter((pattern) => pattern.test(text)).length;
    if (matchedScamPatterns >= 2) issues.push("suspicious_payment_or_pressure_language");
    else if (matchedScamPatterns === 1) issues.push("review_payment_or_pressure_language");

    // Contradictory/implausible structural values.
    if (property.bedrooms > 0 && property.areaSqft / property.bedrooms < 80) {
      issues.push("unusually_small_area_for_bedrooms");
    }
    if (property.bathrooms > Math.max(property.bedrooms + 2, 4)) {
      issues.push("unusual_bathroom_count");
    }
    if (property.price > 0 && property.listingType === "RENT" && property.price < 1000) {
      issues.push("suspiciously_low_rent");
    }

    // Exact duplicate photos and repeated image URLs/storage keys.
    const imageKeys = property.images.map((image) => image.url ?? image.storageKey);
    const duplicateImages = imageKeys.filter((key, index) => imageKeys.indexOf(key) !== index).length;
    if (duplicateImages > 0) issues.push("duplicate_photos");

    // Detect obvious copy-paste/spam descriptions using repeated sentence/phrase patterns.
    const normalizedDescription = description.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const words = normalizedDescription.split(" ").filter(Boolean);
    const uniqueWords = new Set(words);
    if (words.length >= 20 && uniqueWords.size / words.length < 0.35) {
      issues.push("repetitive_description");
    }
    if (/(.)\1{5,}/i.test(normalizedDescription) || /https?:\/\//i.test(description)) {
      issues.push("spam_like_description");
    }

    // A small deterministic risk score keeps the decision explainable and free.
    const riskScore = Math.min(
      100,
      matchedScamPatterns * 30 +
        duplicateImages * 25 +
        (issues.includes("spam_like_description") ? 25 : 0) +
        (issues.includes("repetitive_description") ? 20 : 0) +
        (issues.includes("suspiciously_low_rent") ? 20 : 0) +
        (issues.includes("unusually_small_area_for_bedrooms") ? 15 : 0) +
        (issues.includes("unusual_bathroom_count") ? 10 : 0),
    );

    const blockingIssues = issues.filter((issue) => !issue.startsWith("review_"));
    if (blockingIssues.length || riskScore > 20) {
      await tx.property.update({
        where: { id: propertyId },
        data: { verificationStatus: "PENDING" },
      });
      await tx.auditLog.create({
        data: {
          actorId: property.ownerId,
          action: "Listing automated safety review",
          entityType: "Property",
          entityId: propertyId,
          result: "DENIED",
          metadata: { riskScore, issues },
        },
      });
      return {
        published: false,
        reason: "MANUAL_REVIEW" as const,
        issues,
        riskScore,
      };
    }

    // Safety checks are advisory only. Publication always requires an
    // explicit admin moderation decision.
    await tx.property.update({
      where: { id: propertyId },
      data: { status: "UNDER_REVIEW", publishedAt: null, verificationStatus: property.verificationStatus },
    });

    await tx.auditLog.create({
      data: {
        actorId: property.ownerId,
        action: "Listing automated safety review completed",
        entityType: "Property",
        entityId: propertyId,
        metadata: { riskScore: 0, issues: [], verificationStatus: property.verificationStatus, requiresAdminApproval: true },
      },
    });

    return {
      published: false,
      reason: "MANUAL_REVIEW" as const,
      riskScore: 0,
    };
  });
}

export const MONTHLY_LISTING_LIMIT = 2;
export const LISTING_LIMIT_MESSAGE = "You can post up to 2 properties per month.";

function indiaCalendarMonthRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+05:30`);
  return { start, end };
}

export async function getOwnerListingQuota(ownerId: string) {
  const db = await requireDb();
  const { start, end } = indiaCalendarMonthRange();
  const [owner, used] = await Promise.all([
    db.user.findUnique({ where: { id: ownerId }, select: { role: true } }),
    db.property.count({ where: { ownerId, createdAt: { gte: start, lt: end } } }),
  ]);
  const limited = owner?.role === "USER" || owner?.role === "OWNER";
  return { limit: limited ? MONTHLY_LISTING_LIMIT : null, used, remaining: limited ? Math.max(0, MONTHLY_LISTING_LIMIT - used) : null, message: limited && used >= MONTHLY_LISTING_LIMIT ? LISTING_LIMIT_MESSAGE : null };
}

export async function createOwnerProperty(ownerId: string, p: NewOwnerProperty) {
  const db = await requireDb();
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${slugify(`${p.bedrooms}bhk ${p.propertyType} ${p.locality} ${p.city}`)}-${crypto.randomUUID().slice(0, 8)}`;
  const { start, end } = indiaCalendarMonthRange();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const owner = await tx.user.findUnique({ where: { id: ownerId }, select: { role: true } });
        if (owner?.role === "USER" || owner?.role === "OWNER") {
          const used = await tx.property.count({ where: { ownerId, createdAt: { gte: start, lt: end } } });
          if (used >= MONTHLY_LISTING_LIMIT) throw new Error(LISTING_LIMIT_MESSAGE);
        }
        const prop = await tx.property.create({
      data: {
        slug, title: p.title, description: p.description, propertyType: p.propertyType, listingType: p.listingType,
        price: p.price, deposit: p.deposit, areaSqft: p.areaSqft, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking,
        furnishing: p.furnishing, availableFrom: p.availableFrom, city: p.city, state: p.state, locality: p.locality, addressLine1: p.addressLine1,
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
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("Could not create listing safely. Please try again.");
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
