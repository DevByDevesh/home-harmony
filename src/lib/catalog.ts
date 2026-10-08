import pune from "@/assets/new-home-pune.jpg";
import mumbai from "@/assets/new-home-mumbai.jpg";
import bengaluru from "@/assets/new-home-bengaluru.jpg";
import house from "@/assets/new-home-house.jpg";
import { formatDisplayPrice } from "./price-format";

export type Home = {
  slug: string; name: string; city: string; neighborhood: string;
  mode: "Rent" | "Buy"; kind: "Apartment" | "House" | "Room" | "PG" | "Commercial";
  price: number; beds: number; baths: number; area: number; furnishing: string;
  image: string; description: string; features: string[];
  galleryImages?: string[]; floorPlanImages?: string[];
  /** Searchable structural facts; optional for legacy/demo listings. */
  propertyAgeYears?: number; floor?: number; totalFloors?: number;
};

// Entirely fictional editorial examples. No real availability, ownership or verification is implied.
export const homes: Home[] = [
  { slug: "2bhk-apartment-hinjewadi-pune-2101", name: "The Sunroom", city: "Pune", neighborhood: "Hinjewadi", mode: "Rent", kind: "Apartment", price: 32000, beds: 2, baths: 2, area: 1080, furnishing: "Fully furnished", image: pune, description: "An open, light-filled apartment shaped around an easy everyday rhythm. The living area opens onto a planted balcony, with room to work, gather and unwind.", features: ["Balcony", "Parking", "Lift", "Power backup"] },
  { slug: "3bhk-apartment-bandra-mumbai-2102", name: "The Light House", city: "Mumbai", neighborhood: "Bandra West", mode: "Rent", kind: "Apartment", price: 138000, beds: 3, baths: 3, area: 1720, furnishing: "Fully furnished", image: mumbai, description: "A generous city apartment where expansive windows, tactile finishes and considered spaces make room for both quiet mornings and busy evenings.", features: ["Parking", "Lift", "Air conditioning", "Balcony"] },
  { slug: "2bhk-apartment-indiranagar-bengaluru-2103", name: "The Grove", city: "Bengaluru", neighborhood: "Indiranagar", mode: "Rent", kind: "Apartment", price: 54000, beds: 2, baths: 2, area: 1240, furnishing: "Semi furnished", image: bengaluru, description: "Warm timber, a welcoming dining space and an airy living room give this home a quiet sense of balance.", features: ["Balcony", "Lift", "Parking", "Power backup"] },
  { slug: "4bhk-house-baner-pune-2104", name: "The Courtyard House", city: "Pune", neighborhood: "Baner", mode: "Buy", kind: "House", price: 31500000, beds: 4, baths: 4, area: 2880, furnishing: "Unfurnished", image: house, description: "A contemporary independent house with planted outdoor space, generous proportions and an adaptable plan for a growing household.", features: ["Garden", "Parking", "Terrace", "Study"] },
  { slug: "2bhk-apartment-jubilee-hills-hyderabad-2105", name: "The Veranda", city: "Hyderabad", neighborhood: "Jubilee Hills", mode: "Rent", kind: "Apartment", price: 67000, beds: 2, baths: 2, area: 1320, furnishing: "Fully furnished", image: pune, description: "An inviting apartment with connected living spaces and an outdoor corner for slow afternoons.", features: ["Balcony", "Parking", "Lift"] },
  { slug: "3bhk-apartment-greater-kailash-delhi-2106", name: "The Gallery", city: "Delhi NCR", neighborhood: "Greater Kailash", mode: "Rent", kind: "Apartment", price: 95000, beds: 3, baths: 3, area: 1640, furnishing: "Semi furnished", image: mumbai, description: "A calm, flexible home with generous light and distinct spaces for entertaining and everyday life.", features: ["Parking", "Balcony", "Air conditioning"] },
  { slug: "1bhk-apartment-adyar-chennai-2107", name: "The Palm", city: "Chennai", neighborhood: "Adyar", mode: "Rent", kind: "Apartment", price: 26000, beds: 1, baths: 1, area: 720, furnishing: "Semi furnished", image: bengaluru, description: "A compact home with natural light, warm finishes and a relaxed living area.", features: ["Balcony", "Lift"] },
  { slug: "3bhk-house-prahlad-nagar-ahmedabad-2108", name: "The Garden House", city: "Ahmedabad", neighborhood: "Prahlad Nagar", mode: "Buy", kind: "House", price: 21500000, beds: 3, baths: 3, area: 2100, furnishing: "Unfurnished", image: house, description: "A modern house with a leafy outdoor edge and comfortable family spaces.", features: ["Garden", "Parking", "Terrace"] },
  { slug: "2bhk-apartment-dharampeth-nagpur-2109", name: "The Olive", city: "Nagpur", neighborhood: "Dharampeth", mode: "Rent", kind: "Apartment", price: 24000, beds: 2, baths: 2, area: 940, furnishing: "Semi furnished", image: pune, description: "An easygoing two-bedroom apartment with a welcoming living room and practical proportions.", features: ["Parking", "Balcony", "Lift"] },
];

export type HomeQuery = { location?: string | undefined; mode?: string | undefined; kind?: string | undefined; min?: string | undefined; max?: string | undefined };
export function searchHomes(catalog: Home[], query: HomeQuery): Home[] {
  const place = (query.location ?? "").trim().toLocaleLowerCase();
  const minBudget = Number(query.min);
  const maxBudget = Number(query.max);
  return catalog.filter(home =>
    (!place || `${home.city} ${home.neighborhood} ${home.name}`.toLocaleLowerCase().includes(place)) &&
    (!query.mode || home.mode === query.mode) &&
    (!query.kind || home.kind === query.kind) &&
    (!query.min || !Number.isFinite(minBudget) || home.price >= minBudget) &&
    (!query.max || !Number.isFinite(maxBudget) || home.price <= maxBudget)
  );
}
export function displayPrice(home: Home) {
  return formatDisplayPrice(home.mode, home.price);
}

/* ---------- Phase 2: listing details (fictional) ---------- */
export type ListingStatus = "DRAFT" | "ACTIVE" | "UNDER_REVIEW" | "REJECTED" | "SUSPENDED" | "PAUSED" | "RENTED" | "SOLD" | "EXPIRED" | "DELETED" | "ARCHIVED";
/** Each check must come from a real verification record. Showcase homes have none, so every value is false. */
export type Verification = { ownerIdentity: boolean; phone: boolean; location: boolean; listingReviewed: boolean; photosChecked: boolean; availabilityConfirmed: boolean };
export type ListingDetails = {
  lat: number; lng: number; deposit: number; brokerage: "None" | "Half month" | "One month" | "1% of price";
  parking: number; availableFrom: string | null; updatedAt: string; status: ListingStatus; verification: Verification;
  propertyAgeYears?: number; floor?: number; totalFloors?: number;
  ownerPhone?: string | null; ownerContactChannels?: string[];
};
export type Listing = Home & ListingDetails & { promotion?: "FEATURED" | "BOOST" | null };

const unverified: Verification = { ownerIdentity: false, phone: false, location: false, listingReviewed: false, photosChecked: false, availabilityConfirmed: false };
const details: Record<string, Omit<ListingDetails, "verification" | "status">> = {
  "2bhk-apartment-hinjewadi-pune-2101": { lat: 18.5913, lng: 73.7389, deposit: 96000, brokerage: "None", parking: 1, availableFrom: null, updatedAt: "2026-09-27" },
  "3bhk-apartment-bandra-mumbai-2102": { lat: 19.0596, lng: 72.8295, deposit: 552000, brokerage: "One month", parking: 1, availableFrom: "2026-10-15", updatedAt: "2026-09-24" },
  "2bhk-apartment-indiranagar-bengaluru-2103": { lat: 12.9784, lng: 77.6408, deposit: 324000, brokerage: "None", parking: 1, availableFrom: null, updatedAt: "2026-09-26" },
  "4bhk-house-baner-pune-2104": { lat: 18.559, lng: 73.7868, deposit: 0, brokerage: "1% of price", parking: 2, availableFrom: null, updatedAt: "2026-09-20" },
  "2bhk-apartment-jubilee-hills-hyderabad-2105": { lat: 17.4326, lng: 78.4071, deposit: 201000, brokerage: "Half month", parking: 1, availableFrom: "2026-11-01", updatedAt: "2026-09-25" },
  "3bhk-apartment-greater-kailash-delhi-2106": { lat: 28.5482, lng: 77.238, deposit: 285000, brokerage: "One month", parking: 2, availableFrom: null, updatedAt: "2026-09-22" },
  "1bhk-apartment-adyar-chennai-2107": { lat: 13.0012, lng: 80.2565, deposit: 130000, brokerage: "None", parking: 0, availableFrom: null, updatedAt: "2026-09-28" },
  "3bhk-house-prahlad-nagar-ahmedabad-2108": { lat: 23.012, lng: 72.5108, deposit: 0, brokerage: "1% of price", parking: 2, availableFrom: "2026-12-01", updatedAt: "2026-09-18" },
  "2bhk-apartment-dharampeth-nagpur-2109": { lat: 21.1418, lng: 79.066, deposit: 72000, brokerage: "None", parking: 1, availableFrom: null, updatedAt: "2026-09-26" },
};

/** Single source of listings. Replace with an API/Prisma repository later; views only depend on the Listing type. */
export const listings: Listing[] = homes.map(home => ({ ...home, ...details[home.slug]!, status: "ACTIVE", verification: unverified }));
export function getListing(slug: string) { return listings.find(item => item.slug === slug); }
export const cities = ["Pune", "Mumbai", "Bengaluru", "Delhi NCR", "Hyderabad", "Chennai", "Ahmedabad", "Nagpur"];
export const amenityOptions = ["Balcony", "Parking", "Lift", "Power backup", "Air conditioning", "Garden", "Terrace", "Study"];
export function isVerified(item: Listing) { return Object.values(item.verification).every(Boolean); }
export function availabilityLabel(item: Listing) {
  if (!item.availableFrom) return "Listed as available now";
  return `Listed from ${new Date(item.availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}
export function inr(value: number) { return `₹${value.toLocaleString("en-IN")}`; }
