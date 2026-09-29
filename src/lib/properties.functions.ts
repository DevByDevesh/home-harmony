/**
 * Public, read-only property server functions backed by PostgreSQL.
 * Only ACTIVE listings are returned, with a safe projection (no owner/agent ids,
 * no street address). Not wired into the UI while the database has no properties.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicProperty = {
  id: string; slug: string; title: string; description: string;
  propertyType: string; listingType: string; price: number; deposit: number | null;
  areaSqft: number; bedrooms: number; bathrooms: number; parking: number; furnishing: string;
  availableFrom: string | null; city: string; locality: string;
  verificationStatus: string; publishedAt: string | null;
  images: { url: string | null; altText: string; type: string }[];
  amenities: string[];
};

type Row = Awaited<ReturnType<typeof import("./db/repositories/properties.server").listPublicProperties>>[number];

function toPublic(p: Row): PublicProperty {
  return {
    id: p.id, slug: p.slug, title: p.title, description: p.description,
    propertyType: p.propertyType, listingType: p.listingType, price: p.price, deposit: p.deposit,
    areaSqft: p.areaSqft, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking, furnishing: p.furnishing,
    availableFrom: p.availableFrom?.toISOString() ?? null, city: p.city, locality: p.locality,
    verificationStatus: p.verificationStatus, publishedAt: p.publishedAt?.toISOString() ?? null,
    images: p.images.map((i) => ({ url: i.url, altText: i.altText, type: i.type })),
    amenities: p.amenities.map((a) => a.amenity.name),
  };
}

export const listPropertiesFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ city: z.string().max(80).optional(), listingType: z.enum(["RENT", "BUY"]).optional(), take: z.number().int().min(1).max(100).optional() })
      .strict().parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { listPublicProperties } = await import("./db/repositories/properties.server");
    const rows = await listPublicProperties({
      ...(data.city ? { city: data.city } : {}),
      ...(data.listingType ? { listingType: data.listingType } : {}),
      ...(data.take ? { take: data.take } : {}),
    });
    return rows.map(toPublic);
  });

export const getPropertyFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ idOrSlug: z.string().min(1).max(200) }).strict().parse(d))
  .handler(async ({ data }) => {
    const { getPublicProperty } = await import("./db/repositories/properties.server");
    const row = await getPublicProperty(data.idOrSlug);
    return row ? toPublic(row) : null;
  });
