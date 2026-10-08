/**
 * Maps public DB property rows to the existing `Listing` view shape so the
 * listing/detail UI stays unchanged. Demo photos are resolved from their
 * storage key; a missing URL falls back to a neutral illustrative image.
 */
import pune from "@/assets/new-home-pune.jpg";
import mumbai from "@/assets/new-home-mumbai.jpg";
import bengaluru from "@/assets/new-home-bengaluru.jpg";
import house from "@/assets/new-home-house.jpg";
import type { Listing } from "@/lib/catalog";
import type { PublicProperty } from "@/lib/properties.functions";

const demoImages: Record<string, string> = {
  "demo/new-home-pune.jpg": pune, "demo/new-home-mumbai.jpg": mumbai,
  "demo/new-home-bengaluru.jpg": bengaluru, "demo/new-home-house.jpg": house,
};
const kinds = { APARTMENT: "Apartment", HOUSE: "House", ROOM: "Room", PG: "PG", COMMERCIAL: "Commercial" } as const;
const furnishings: Record<string, string> = { FULLY_FURNISHED: "Fully furnished", SEMI_FURNISHED: "Semi furnished", UNFURNISHED: "Unfurnished" };
const brokerages = ["None", "Half month", "One month", "1% of price"] as const;
const unverified = { ownerIdentity: false, phone: false, location: false, listingReviewed: false, photosChecked: false, availabilityConfirmed: false };

export function toListing(p: PublicProperty): Listing {
  // Owner-uploaded photos (stored with a public URL) take the cover; sample photos are only a fallback.
  const img = p.images.find((i) => i.storageKey.startsWith("properties/") && i.url) ?? p.images[0];
  return {
    slug: p.slug, name: p.title, city: p.city, neighborhood: p.locality,
    mode: p.listingType === "BUY" ? "Buy" : "Rent",
    kind: kinds[p.propertyType as keyof typeof kinds] ?? "Apartment",
    price: p.price, beds: p.bedrooms, baths: p.bathrooms, area: p.areaSqft,
    furnishing: furnishings[p.furnishing] ?? "Unfurnished",
    image: img?.url || (img ? demoImages[img.storageKey] : undefined) || house,
    galleryImages: p.images.filter((i) => i.type === "PHOTO" && i.url).map((i) => i.url as string),
    floorPlanImages: p.images.filter((i) => i.type === "FLOOR_PLAN" && i.url).map((i) => i.url as string),
    description: p.description, features: p.amenities,
    lat: p.latitude ?? 0, lng: p.longitude ?? 0, deposit: p.deposit ?? 0,
    brokerage: (brokerages as readonly string[]).includes(p.brokerage ?? "") ? (p.brokerage as Listing["brokerage"]) : "None",
    parking: p.parking, ...(p.propertyAgeYears != null ? { propertyAgeYears: p.propertyAgeYears } : {}), ...(p.floor != null ? { floor: p.floor } : {}), ...(p.totalFloors != null ? { totalFloors: p.totalFloors } : {}), availableFrom: p.availableFrom ? p.availableFrom.slice(0, 10) : null,
    updatedAt: p.updatedAt.slice(0, 10), status: "ACTIVE",
    // Verification is never inferred; DB listings are unverified until a real record exists.
    verification: unverified,
  };
}
