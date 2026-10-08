import test from "node:test";
import assert from "node:assert/strict";
import { rankMatches } from "./match.ts";
import type { Listing } from "./catalog.ts";

const listing = (over: Partial<Listing> = {}): Listing => ({
  slug: "home", name: "Home", city: "Nagpur", neighborhood: "Dharampeth", mode: "Rent", kind: "Apartment",
  price: 18000, beds: 2, baths: 2, area: 950, furnishing: "Semi furnished", image: "", description: "",
  features: ["Parking", "Lift"], lat: 21.14, lng: 79.08, deposit: 54000, brokerage: "None", parking: 1,
  availableFrom: null, updatedAt: "2026-10-01", status: "ACTIVE",
  verification: { ownerIdentity:false, phone:false, location:false, listingReviewed:false, photosChecked:false, availabilityConfirmed:false },
  ...over,
});

test("ranks properties by match score and keeps the highest score first", () => {
  const result = rankMatches([
    listing({ slug: "weak", price: 28000, beds: 1, parking: 0, features: [] }),
    listing({ slug: "strong", price: 18000, beds: 2, parking: 1 }),
  ], { location: "Nagpur", max: "20000", beds: "2", parking: "1" });

  assert.deepEqual(result.map(x => x.listing.slug), ["strong", "weak"]);
  assert.equal(result[0]?.match.score, 100);
});

test("does not return listings when fewer than two criteria can be scored", () => {
  const result = rankMatches([listing()], { location: "Nagpur" });
  assert.deepEqual(result, []);
});
