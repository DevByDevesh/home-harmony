import type { Listing } from "./catalog.ts";

export function isListingVerified(item: Pick<Listing, "verification">) {
  return Object.values(item.verification).every(Boolean);
}
