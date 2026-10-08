import test from "node:test";
import assert from "node:assert/strict";
import { resolveSavedListingState } from "./saved-listing-state.ts";
import type { Listing } from "./catalog.ts";

const listing = (slug: string, status: Listing["status"] = "ACTIVE"): Listing => ({
  slug, name: slug, city: "Nagpur", neighborhood: "Dharampeth", mode: "Rent", kind: "Apartment",
  price: 18000, beds: 2, baths: 2, area: 950, furnishing: "Semi furnished", image: "", description: "",
  features: ["Parking"], lat: 21.14, lng: 79.08, deposit: 54000, brokerage: "None", parking: 1,
  availableFrom: null, updatedAt: "2026-10-01", status,
  verification: { ownerIdentity:false, phone:false, location:false, listingReviewed:false, photosChecked:false, availabilityConfirmed:false },
});

test("keeps live saved listings active", () => {
  const result = resolveSavedListingState(["home"], [listing("home")]);
  assert.equal(result.active.length, 1);
  assert.equal(result.stale.length, 0);
});

test("moves missing or inactive saved listings into stale state", () => {
  const result = resolveSavedListingState(["missing", "expired"], [listing("expired", "EXPIRED")]);
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.stale.map(x => x.slug), ["missing", "expired"]);
});

test("does not mark stale items before live data has loaded", () => {
  const result = resolveSavedListingState(["home"], undefined);
  assert.equal(result.active, null);
  assert.equal(result.stale, []);
});
