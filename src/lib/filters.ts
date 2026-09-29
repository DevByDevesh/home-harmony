import { z } from "zod";
import type { Listing } from "./catalog";
import { isVerified } from "./catalog";
import { computeMatch } from "./match";

/** URL-safe discovery filters. Everything is a string so links stay shareable. */
export const filterSchema = z.object({
  location: z.string().optional(), mode: z.string().optional(), kind: z.string().optional(), city: z.string().optional(),
  beds: z.string().optional(), min: z.string().optional(), max: z.string().optional(), minArea: z.string().optional(),
  furnishing: z.string().optional(), parking: z.string().optional(), baths: z.string().optional(), amenities: z.string().optional(),
  available: z.string().optional(), verified: z.string().optional(), match: z.string().optional(), sort: z.string().optional(), view: z.string().optional(),
});
export type Filters = z.infer<typeof filterSchema>;
export type FilterKey = keyof Filters;

const num = (v?: string) => { const n = Number(v); return v && Number.isFinite(n) ? n : undefined; };
export const amenityList = (f: Filters) => (f.amenities ? f.amenities.split(",").filter(Boolean) : []);

export function applyFilters(items: Listing[], f: Filters): Listing[] {
  const place = (f.location ?? "").trim().toLocaleLowerCase();
  const min = num(f.min), max = num(f.max), beds = num(f.beds), area = num(f.minArea), baths = num(f.baths), match = num(f.match);
  const amenities = amenityList(f);
  const result = items.filter(h =>
    (!place || `${h.city} ${h.neighborhood} ${h.name}`.toLocaleLowerCase().includes(place)) &&
    (!f.mode || h.mode === f.mode) && (!f.kind || h.kind === f.kind) && (!f.city || h.city === f.city) &&
    (beds === undefined || (beds >= 4 ? h.beds >= 4 : h.beds === beds)) &&
    (min === undefined || h.price >= min) && (max === undefined || h.price <= max) &&
    (area === undefined || h.area >= area) && (!f.furnishing || h.furnishing === f.furnishing) &&
    (!f.parking || h.parking > 0) && (baths === undefined || h.baths >= baths) &&
    amenities.every(a => h.features.includes(a)) && (!f.available || !h.availableFrom) &&
    (!f.verified || isVerified(h)) &&
    (match === undefined || (computeMatch(h, f)?.score ?? 0) >= match));
  return sortListings(result, f.sort);
}
export function sortListings(items: Listing[], sort?: string) {
  const copy = [...items];
  if (sort === "price-asc") copy.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") copy.sort((a, b) => b.price - a.price);
  if (sort === "area") copy.sort((a, b) => b.area - a.area);
  if (sort === "recent") copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return copy;
}

const labels: Partial<Record<FilterKey, (v: string) => string>> = {
  location: v => v, mode: v => (v === "Rent" ? "Rent" : "Buy"), kind: v => v, city: v => v, beds: v => (v === "4" ? "4+ BHK" : `${v} BHK`),
  min: v => `From ₹${Number(v).toLocaleString("en-IN")}`, max: v => `Up to ₹${Number(v).toLocaleString("en-IN")}`,
  minArea: v => `${v}+ sq.ft.`, furnishing: v => v, parking: () => "Parking", baths: v => `${v}+ baths`,
  available: () => "Available now", verified: () => "Verified only", match: v => `${v}%+ match`,
};
export type Chip = { key: FilterKey; label: string; value?: string };
export function activeChips(f: Filters): Chip[] {
  const chips: Chip[] = [];
  for (const key of Object.keys(labels) as FilterKey[]) { const v = f[key]; if (v) chips.push({ key, label: labels[key]!(v) }); }
  for (const a of amenityList(f)) chips.push({ key: "amenities", label: a, value: a });
  return chips;
}
export function removeChip(f: Filters, chip: Chip): Filters {
  if (chip.key === "amenities") { const rest = amenityList(f).filter(a => a !== chip.value); return { ...f, amenities: rest.length ? rest.join(",") : undefined }; }
  return { ...f, [chip.key]: undefined };
}
export function clearFilters(f: Filters): Filters { return { view: f.view, sort: f.sort }; }
