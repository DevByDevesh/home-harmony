/**
 * Owner listings backed by PostgreSQL. Identity always comes from the session;
 * ownership is enforced in the database query, never from client input.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicProperty } from "./properties.functions";

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
