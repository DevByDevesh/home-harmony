/**
 * Owner listings backed by PostgreSQL. Identity always comes from the session;
 * ownership is enforced in the database query, never from client input.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicProperty } from "./properties.functions";
import { LISTING_LIMIT_MESSAGE, MONTHLY_LISTING_LIMIT, getOwnerListingQuota } from "./db/repositories/properties.server";

export type OwnerDbListing = PublicProperty & { status: string };

function rethrow(e: unknown): never {
  if (e instanceof Error) throw new Error(e.message);
  throw e;
}

export const listMyListingsFn = createServerFn({ method: "GET" }).handler(async (): Promise<OwnerDbListing[]> => {
  try {
    const { requireRole } = await import("./auth/guards.server");
    const { AREA_ROLES } = await import("./auth/roles");
    const me = await requireRole(AREA_ROLES.owner, "owner.listings");
    const { listOwnerProperties } = await import("./db/repositories/properties.server");
    const rows = await listOwnerProperties(me.id);
    return rows.map((p) => ({
      id: p.id, slug: p.slug, title: p.title, description: p.description,
      propertyType: p.propertyType, listingType: p.listingType, price: p.price, deposit: p.deposit,
      areaSqft: p.areaSqft, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking, furnishing: p.furnishing,
      availableFrom: p.availableFrom?.toISOString() ?? null, city: p.city, locality: p.locality,
      verificationStatus: p.verificationStatus, publishedAt: p.publishedAt?.toISOString() ?? null, updatedAt: p.updatedAt.toISOString(),
      brokerage: p.brokerage, latitude: p.latitude == null ? null : Number(p.latitude), longitude: p.longitude == null ? null : Number(p.longitude),
      images: p.images.map((i) => ({ url: i.url, storageKey: i.storageKey, altText: i.altText, type: i.type })),
      amenities: p.amenities.map((a) => a.amenity.name),
      status: p.status,
      ownerPhone: null,
      ownerContactChannels: [],
    }));
  } catch (e) { rethrow(e); }
});

export const setMyListingStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64), status: z.enum(["ACTIVE", "PAUSED"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireRole } = await import("./auth/guards.server");
      const { AREA_ROLES } = await import("./auth/roles");
      const { writeAudit } = await import("./auth/audit.server");
      const me = await requireRole(AREA_ROLES.owner, "owner.listing.status");
      const { setOwnerPropertyStatus } = await import("./db/repositories/properties.server");
      const changed = await setOwnerPropertyStatus(data.id, me.id, data.status);
      if (!changed) {
        await writeAudit({ actorId: me.id, action: "listing.status", entityType: "Property", entityId: data.id, result: "DENIED", metadata: { to: data.status } });
        return { ok: false as const, message: "You can only change your own listings." };
      }
      await writeAudit({ actorId: me.id, action: "listing.status", entityType: "Property", entityId: data.id, metadata: { to: data.status } });
      return { ok: true as const, status: data.status };
    } catch (e) { rethrow(e); }
  });

export const setMyListingArchiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64), archived: z.boolean() }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireRole } = await import("./auth/guards.server");
      const { AREA_ROLES } = await import("./auth/roles");
      const { writeAudit } = await import("./auth/audit.server");
      const me = await requireRole(AREA_ROLES.owner, "owner.listing.archive");
      const { setOwnerPropertyArchived } = await import("./db/repositories/properties.server");
      const changed = await setOwnerPropertyArchived(data.id, me.id, data.archived);
      if (!changed) {
        await writeAudit({
          actorId: me.id,
          action: "listing.archive",
          entityType: "Property",
          entityId: data.id,
          result: "DENIED",
          metadata: { archived: data.archived },
        });
        return { ok: false as const, message: "You can only archive your own listings." };
      }
      await writeAudit({
        actorId: me.id,
        action: "listing.archive",
        entityType: "Property",
        entityId: data.id,
        metadata: { archived: data.archived },
      });
      return { ok: true as const, archived: data.archived };
    } catch (e) { rethrow(e); }
  });

const photoKey = { living: "demo/new-home-pune.jpg", city: "demo/new-home-mumbai.jpg", dining: "demo/new-home-bengaluru.jpg", exterior: "demo/new-home-house.jpg" } as const;
const numStr = (min: number, max: number) => z.string().trim().refine((v) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max; }).transform(Number);
const createSchema = z.object({
  kind: z.enum(["Apartment", "House", "Room", "PG", "Commercial"]), mode: z.enum(["Rent", "Buy"]),
  country: z.string().trim().min(1).max(80), state: z.string().trim().min(1).max(80), city: z.string().trim().min(1).max(80), locality: z.string().trim().min(1).max(120), address: z.string().trim().max(300),
  title: z.string().trim().max(160), price: numStr(1, 10_000_000_000), deposit: z.string().trim().max(15),
  availableFrom: z.string().trim().max(10), beds: numStr(0, 50), baths: numStr(0, 50), area: numStr(1, 1_000_000),
  furnishing: z.enum(["Fully furnished", "Semi furnished", "Unfurnished"]), parking: numStr(0, 50),
  amenities: z.array(z.string().trim().min(1).max(60)).max(40), description: z.string().trim().max(5000),
  photos: z.array(z.enum(["living", "city", "dining", "exterior"])).max(10),
  checks: z.array(z.enum(["ownerIdentity", "phone", "location", "listingReview", "photos", "availability"])).max(10).default([]),
});
type WizardInput = z.infer<typeof createSchema>;
const checkType = { ownerIdentity: "OWNER_IDENTITY", phone: "PHONE", location: "LOCATION", listingReview: "PROPERTY", photos: "PHOTOS", availability: "AVAILABILITY" } as const;

/** Maps wizard input to repository fields. Listing review + photo checks are always requested (matches the wizard copy). */
function toPropertyInput(d: WizardInput) {
  const deposit = Number(d.deposit);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(d.availableFrom) ? new Date(d.availableFrom) : null;
  return {
    title: d.title || `${d.beds} BHK ${d.kind.toLowerCase()} in ${d.locality}`, description: d.description,
    propertyType: ({ Apartment: "APARTMENT", House: "HOUSE", Room: "ROOM", PG: "PG", Commercial: "COMMERCIAL" } as const)[d.kind],
    listingType: d.mode === "Buy" ? ("BUY" as const) : ("RENT" as const), price: d.price,
    deposit: d.deposit && Number.isFinite(deposit) && deposit >= 0 ? Math.round(deposit) : null,
    areaSqft: d.area, bedrooms: d.beds, bathrooms: d.baths, parking: d.parking,
    furnishing: d.furnishing === "Fully furnished" ? ("FULLY_FURNISHED" as const) : d.furnishing === "Semi furnished" ? ("SEMI_FURNISHED" as const) : ("UNFURNISHED" as const),
    availableFrom: from, city: d.city, locality: d.locality, addressLine1: d.address || null,
    amenities: [...new Set(d.amenities)], photoKeys: [...new Set(d.photos)].map((p) => photoKey[p]),
    checks: [...new Set([...d.checks, "listingReview", "photos"] as const)].map((c) => checkType[c]), country: d.country, state: d.state,
  };
}

/** Creates a DB listing owned by the signed-in owner. Owner id comes from the session only. */
export const getMyListingQuotaFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requireRole } = await import("./auth/guards.server");
    const { AREA_ROLES } = await import("./auth/roles");
    const me = await requireRole(AREA_ROLES.owner, "owner.listing.quota");
    return await getOwnerListingQuota(me.id);
  } catch (e) { rethrow(e); }
});

export const createMyListingFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data: d }) => {
    try {
      const { requireRole } = await import("./auth/guards.server");
      const { AREA_ROLES } = await import("./auth/roles");
      const { writeAudit } = await import("./auth/audit.server");
      const me = await requireRole(AREA_ROLES.owner, "owner.listing.create");
      const { createOwnerProperty } = await import("./db/repositories/properties.server");
      const prop = await createOwnerProperty(me.id, toPropertyInput(d));
      await writeAudit({ actorId: me.id, action: "listing.create", entityType: "Property", entityId: prop.id, metadata: { status: "UNDER_REVIEW", monthlyLimit: MONTHLY_LISTING_LIMIT } });
      return { ok: true as const, id: prop.id };
    } catch (e) {
      if (e instanceof Error && e.message === LISTING_LIMIT_MESSAGE) {
        return { ok: false as const, message: LISTING_LIMIT_MESSAGE };
      }
      rethrow(e);
    }
  });

const fromKind = { APARTMENT: "Apartment", HOUSE: "House", ROOM: "Room", PG: "PG", COMMERCIAL: "Commercial" } as const;
const fromPhoto = Object.fromEntries(Object.entries(photoKey).map(([k, v]) => [v, k])) as Record<string, "living" | "city" | "dining" | "exterior">;
const fromCheck = Object.fromEntries(Object.entries(checkType).map(([k, v]) => [v, k])) as Record<string, string>;

/** Loads the signed-in owner's DB listing as a wizard draft. Returns null when missing or not theirs. */
/** Runs the automatic marketplace review after owner uploads are attached. */
export const autoReviewMyListingFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireRole } = await import("./auth/guards.server");
      const { AREA_ROLES } = await import("./auth/roles");
      const me = await requireRole(AREA_ROLES.owner, "owner.listing.auto-review");
      const { requireDb } = await import("./db/client.server");
      const db = await requireDb();
      const owned = await db.property.findFirst({ where: { id: data.id, ownerId: me.id }, select: { id: true } });
      if (!owned) return { published: false as const, reason: "NOT_FOUND" as const };
      const { autoReviewAndPublishListing } = await import("./db/repositories/properties.server");
      return await autoReviewAndPublishListing(data.id);
    } catch (e) { rethrow(e); }
  });

export const getMyListingDraftFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireRole } = await import("./auth/guards.server");
      const { AREA_ROLES } = await import("./auth/roles");
      const me = await requireRole(AREA_ROLES.owner, "owner.listing.edit");
      const { getOwnerPropertyForEdit } = await import("./db/repositories/properties.server");
      const p = await getOwnerPropertyForEdit(data.id, me.id);
      if (!p) return null;
      const furn = p.furnishing === "FULLY_FURNISHED" ? "Fully furnished" : p.furnishing === "SEMI_FURNISHED" ? "Semi furnished" : "Unfurnished";
      return {
        kind: (fromKind as Record<string, string>)[p.propertyType] ?? "", mode: p.listingType === "BUY" ? "Buy" : "Rent",
        country: "India", state: p.state ?? "", city: p.city, locality: p.locality, address: p.addressLine1 ?? "", title: p.title,
        price: String(p.price), deposit: p.deposit == null ? "" : String(p.deposit),
        availableFrom: p.availableFrom ? p.availableFrom.toISOString().slice(0, 10) : "",
        beds: String(p.bedrooms), baths: String(p.bathrooms), area: String(p.areaSqft), furnishing: furn, parking: String(p.parking),
        amenities: p.amenities.map((a) => a.amenity.name), description: p.description,
        photos: p.images.map((i) => fromPhoto[i.storageKey]).filter((x): x is "living" | "city" | "dining" | "exterior" => !!x),
        checks: [...new Set(p.verifications.map((v) => fromCheck[v.type]).filter((c): c is string => !!c && c !== "listingReview" && c !== "photos"))],
      };
    } catch (e) { rethrow(e); }
  });

/** Saves edits to the same DB listing. Ownership enforced in the repository transaction. */
export const updateMyListingFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64), draft: createSchema }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireRole } = await import("./auth/guards.server");
      const { AREA_ROLES } = await import("./auth/roles");
      const { writeAudit } = await import("./auth/audit.server");
      const me = await requireRole(AREA_ROLES.owner, "owner.listing.edit");
      const { updateOwnerProperty } = await import("./db/repositories/properties.server");
      const r = await updateOwnerProperty(data.id, me.id, toPropertyInput(data.draft));
      if (!r) {
        await writeAudit({ actorId: me.id, action: "listing.update", entityType: "Property", entityId: data.id, result: "DENIED" });
        return { ok: false as const, message: "You can only change your own listings." };
      }
      await writeAudit({ actorId: me.id, action: "listing.update", entityType: "Property", entityId: data.id, metadata: { status: "UNDER_REVIEW", checksAdded: r.added } });
      return { ok: true as const, id: r.id };
    } catch (e) { rethrow(e); }
  });
