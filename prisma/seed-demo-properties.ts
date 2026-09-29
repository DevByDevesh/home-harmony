/**
 * Idempotent seed: copies the existing fictional demo catalog (src/lib/catalog.ts)
 * into PostgreSQL. Upserts by slug, so re-running never duplicates.
 * Listings are ACTIVE but verificationStatus stays NOT_REQUESTED (never verified).
 * Owner is a fictional placeholder account with no login credentials.
 * Run: bun prisma/seed-demo-properties.ts
 */
import { listings } from "../src/lib/catalog";
import { requireDb } from "../src/lib/db/client.server";

const kind = { Apartment: "APARTMENT", House: "HOUSE", Room: "ROOM", PG: "PG", Commercial: "COMMERCIAL" } as const;
const furnishing = (f: string) =>
  f.startsWith("Fully") ? "FULLY_FURNISHED" : f.startsWith("Semi") ? "SEMI_FURNISHED" : "UNFURNISHED";
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const db = await requireDb();

const owner = await db.user.upsert({
  where: { email: "demo-catalog@example.com" },
  update: {},
  create: { email: "demo-catalog@example.com", name: "HouseProvider demo catalog (fictional)", role: "OWNER", status: "ACTIVE" },
});

for (const l of listings) {
  const data = {
    title: l.name, description: l.description,
    propertyType: kind[l.kind], listingType: l.mode === "Buy" ? "BUY" : "RENT",
    price: l.price, deposit: l.deposit, brokerage: l.brokerage,
    areaSqft: l.area, bedrooms: l.beds, bathrooms: l.baths, parking: l.parking,
    furnishing: furnishing(l.furnishing),
    availableFrom: l.availableFrom ? new Date(l.availableFrom) : null,
    city: l.city, locality: l.neighborhood, latitude: l.lat, longitude: l.lng,
    status: "ACTIVE", ownerId: owner.id,
  } as const;
  const p = await db.property.upsert({
    where: { slug: l.slug },
    update: data,
    create: { slug: l.slug, ...data, publishedAt: new Date(l.updatedAt) },
  });

  await db.propertyImage.deleteMany({ where: { propertyId: p.id } });
  await db.propertyImage.create({
    data: { propertyId: p.id, storageKey: `demo/${l.image.split("/").pop()}`, altText: `${l.name}, ${l.neighborhood}, ${l.city} (illustrative image)`, sortOrder: 0 },
  });
  for (const name of l.features) {
    const a = await db.amenity.upsert({ where: { name }, update: {}, create: { name, slug: slugify(name) } });
    await db.propertyAmenity.upsert({
      where: { propertyId_amenityId: { propertyId: p.id, amenityId: a.id } },
      update: {}, create: { propertyId: p.id, amenityId: a.id },
    });
  }
}

console.log(`demo catalog: ${listings.length}`);
process.exit(0);
