import test from "node:test";
import assert from "node:assert/strict";
import { applyFilters, sortListings, type Filters } from "./filters.ts";
import { isListingVerified, verificationFromStatus } from "./listing-trust.ts";
import type { Listing } from "./catalog.ts";

const base = (over: Partial<Listing> = {}): Listing => ({
  slug: "test", name: "Test", city: "Pune", neighborhood: "Baner", mode: "Rent", kind: "Apartment",
  price: 30000, beds: 2, baths: 2, area: 1100, furnishing: "Semi furnished", image: "", description: "",
  features: ["Parking", "Lift"], lat: 18.5, lng: 73.8, deposit: 90000, brokerage: "None", parking: 1,
  availableFrom: null, updatedAt: "2026-10-01", status: "ACTIVE",
  verification: { ownerIdentity:false, phone:false, location:false, listingReviewed:false, photosChecked:false, availabilityConfirmed:false },
  ...over,
});

test("advanced filters narrow by property age and floor", () => {
  const items = [
    base({ slug: "new", propertyAgeYears: 2, floor: 5 }),
    base({ slug: "old", propertyAgeYears: 12, floor: 2 }),
  ];
  const filters = { propertyAgeMax: "5", floorMin: "4" } as Filters;
  assert.deepEqual(applyFilters(items, filters).map(x => x.slug), ["new"]);
});

test("relevance sorting uses match score when requested", () => {
  const items = [
    base({ slug: "weak", beds: 1, price: 60000 }),
    base({ slug: "strong", beds: 2, price: 30000 }),
  ];
  const filters = { beds: "2", max: "40000", sort: "relevance" } as Filters;
  assert.equal(sortListings(items, "relevance", filters)[0]?.slug, "strong");
});

test("VERIFIED database status maps to a fully verified listing trust record", () => {
  const verified = base({ slug: "verified", verification: verificationFromStatus("VERIFIED") });
  const unverified = base({ slug: "unverified" });

  assert.equal(isListingVerified({ verification: verified.verification }), true);
  assert.equal(isListingVerified({ verification: unverified.verification }), false);
  assert.deepEqual(applyFilters([verified, unverified], { verified: "true" } as Filters).map(x => x.slug), ["verified"]);
});
