import type { Listing } from "./catalog";

export type SavedListingState = {
  active: Listing[] | null;
  stale: { slug: string; listing: Listing | null }[];
};

/** Resolve saved/compared slugs against the live ACTIVE listing feed without reviving stale catalog data. */
export function resolveSavedListingState(slugs: string[], live: Listing[] | undefined): SavedListingState {
  if (!live) return { active: null, stale: [] };
  const bySlug = new Map(live.map(item => [item.slug, item]));
  const active: Listing[] = [];
  const stale: SavedListingState["stale"] = [];

  for (const slug of slugs) {
    const listing = bySlug.get(slug);
    if (listing?.status === "ACTIVE") active.push(listing);
    else stale.push({ slug, listing: listing ?? null });
  }

  return { active, stale };
}

export function staleListingLabel(item: { slug: string; listing: Listing | null }) {
  if (!item.listing) return "No longer listed";
  if (item.listing.status === "EXPIRED") return "Listing expired";
  if (item.listing.status === "DELETED") return "Listing removed";
  if (item.listing.status === "SOLD") return "Property sold";
  if (item.listing.status === "RENTED") return "Property rented";
  if (item.listing.status === "SUSPENDED") return "Listing unavailable";
  return "Listing unavailable";
}
