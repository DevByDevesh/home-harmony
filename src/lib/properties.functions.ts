/**
 * Public, read-only property server functions.
 * When PostgreSQL is configured, ACTIVE listings come from the database.
 * Otherwise the typed fictional catalog is used as a clearly non-live fallback
 * so the public discovery/detail experience remains usable in local/demo setups.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listings } from "./catalog";

export type PublicProperty = {
  id: string; slug: string; title: string; description: string;
  propertyType: string; listingType: string; price: number; deposit: number | null;
  areaSqft: number; bedrooms: number; bathrooms: number; parking: number; propertyAgeYears: number | null; floor: number | null; totalFloors: number | null; furnishing: string;
  availableFrom: string | null; city: string; locality: string;
  verificationStatus: string; publishedAt: string | null; updatedAt: string;
  brokerage: string | null; latitude: number | null; longitude: number | null;
  images: { url: string | null; storageKey: string; altText: string; type: string }[];
  amenities: string[];
};

type Row = Awaited<ReturnType<typeof import("./db/repositories/properties.server").listPublicProperties>>[number];

function toPublic(p: Row): PublicProperty {
  return {
    id: p.id, slug: p.slug, title: p.title, description: p.description,
    propertyType: p.propertyType, listingType: p.listingType, price: p.price, deposit: p.deposit,
    areaSqft: p.areaSqft, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking, propertyAgeYears: p.propertyAgeYears, floor: p.floor, totalFloors: p.totalFloors, furnishing: p.furnishing,
    availableFrom: p.availableFrom?.toISOString() ?? null, city: p.city, locality: p.locality,
    verificationStatus: p.verificationStatus, publishedAt: p.publishedAt?.toISOString() ?? null, updatedAt: p.updatedAt.toISOString(),
    brokerage: p.brokerage, latitude: p.latitude == null ? null : Number(p.latitude), longitude: p.longitude == null ? null : Number(p.longitude),
    images: p.images.map((i) => ({ url: i.url, storageKey: i.storageKey, altText: i.altText, type: i.type })),
    amenities: p.amenities.map((a) => a.amenity.name),
  };
}

function demoProperty(home: (typeof listings)[number]): PublicProperty {
  return {
    id: `demo-${home.slug}`,
    slug: home.slug,
    title: home.name,
    description: home.description,
    propertyType: home.kind.toUpperCase(),
    listingType: home.mode === "Buy" ? "BUY" : "RENT",
    price: home.price,
    deposit: home.deposit,
    areaSqft: home.area,
    bedrooms: home.beds,
    bathrooms: home.baths,
    parking: home.parking,
    furnishing: home.furnishing.toUpperCase().replaceAll(" ", "_"),
    availableFrom: home.availableFrom,
    city: home.city,
    locality: home.neighborhood,
    verificationStatus: "NOT_REQUESTED",
    publishedAt: null,
    updatedAt: home.updatedAt,
    brokerage: home.brokerage,
    latitude: home.lat,
    longitude: home.lng,
    images: [{ url: home.image, storageKey: `demo/${home.slug}`, altText: home.name, type: "PHOTO" }],
    amenities: home.features,
  };
}

function demoListings(input: { city?: string | undefined; listingType?: "RENT" | "BUY" | undefined; minPrice?: number | undefined; maxPrice?: number | undefined; take?: number | undefined }) {
  return listings
    .filter((home) =>
      (!input.city || home.city === input.city) &&
      (!input.listingType || (input.listingType === "BUY" ? home.mode === "Buy" : home.mode === "Rent")) &&
      (input.minPrice === undefined || home.price >= input.minPrice) &&
      (input.maxPrice === undefined || home.price <= input.maxPrice),
    )
    .slice(0, input.take ?? 24)
    .map(demoProperty);
}

export const listPropertiesFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ city: z.string().max(80).optional(), listingType: z.enum(["RENT", "BUY"]).optional(), minPrice: z.number().finite().positive().optional(), maxPrice: z.number().finite().positive().optional(), take: z.number().int().min(1).max(100).optional() })
      .strict().parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { isDatabaseConfigured } = await import("./db/client.server");
    if (!isDatabaseConfigured()) return demoListings(data);

    const { listPublicProperties } = await import("./db/repositories/properties.server");
    const rows = await listPublicProperties({
      ...(data.city ? { city: data.city } : {}),
      ...(data.listingType ? { listingType: data.listingType } : {}),
      ...(data.minPrice !== undefined ? { minPrice: data.minPrice } : {}),
      ...(data.maxPrice !== undefined ? { maxPrice: data.maxPrice } : {}),
      ...(data.take ? { take: data.take } : {}),
    });
    return rows.map(toPublic);
  });

export const getPropertyFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ idOrSlug: z.string().min(1).max(200) }).strict().parse(d))
  .handler(async ({ data }) => {
    const { isDatabaseConfigured } = await import("./db/client.server");
    if (!isDatabaseConfigured()) {
      const home = listings.find((item) => item.slug === data.idOrSlug || `demo-${item.slug}` === data.idOrSlug);
      return home ? demoProperty(home) : null;
    }

    const { getPublicProperty } = await import("./db/repositories/properties.server");
    const row = await getPublicProperty(data.idOrSlug);
    return row ? toPublic(row) : null;
  });
