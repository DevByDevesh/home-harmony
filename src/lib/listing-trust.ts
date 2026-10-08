import type { Listing } from "./catalog.ts";

const verificationChecks = {
  ownerIdentity: false,
  phone: false,
  location: false,
  listingReviewed: false,
  photosChecked: false,
  availabilityConfirmed: false,
} as const;

export function verificationFromStatus(status: string): Listing["verification"] {
  if (status === "VERIFIED") {
    return Object.fromEntries(Object.keys(verificationChecks).map((key) => [key, true])) as Listing["verification"];
  }
  return { ...verificationChecks };
}

export function isListingVerified(item: Pick<Listing, "verification">) {
  return Object.values(item.verification).every(Boolean);
}
