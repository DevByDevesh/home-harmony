import test from "node:test";
import assert from "node:assert/strict";
import { newMatchAlerts, type SavedSearchAlert } from "./alerts.ts";
import type { Listing } from "./catalog.ts";

const listing = (slug: string, city = "Nagpur"): Listing => ({
  slug, name: slug, city, neighborhood: "Dharampeth", mode: "Rent", kind: "Apartment",
  price: 18000, beds: 2, baths: 2, area: 950, furnishing: "Semi furnished", image: "", description: "",
  features: ["Parking"], lat: 21.14, lng: 79.08, deposit: 54000, brokerage: "None", parking: 1,
  availableFrom: null, updatedAt: "2026-10-01", status: "ACTIVE",
  verification: { ownerIdentity:false, phone:false, location:false, listingReviewed:false, photosChecked:false, availabilityConfirmed:false },
});

test("returns only unseen matches for enabled NEW_MATCH alerts", () => {
  const searches: SavedSearchAlert[] = [{
    id: "search-1", label: "Nagpur 2 BHK", filters: { city: "Nagpur", beds: "2" },
    seen: ["old"], alerts: { enabled: true, frequency: "INSTANT", types: ["NEW_MATCH"] },
  }];

  assert.deepEqual(newMatchAlerts(searches, [listing("old"), listing("fresh")]), [{
    searchId: "search-1",
    label: "Nagpur 2 BHK",
    slugs: ["fresh"],
  }]);
});

test("does not alert when alerts are disabled, NEW_MATCH is not selected, or no baseline exists", () => {
  const source = [listing("fresh")];
  const base = { id: "s", label: "Search", filters: { city: "Nagpur" }, seen: ["old"] };
  assert.deepEqual(newMatchAlerts([{ ...base, alerts: { enabled: false, frequency: "INSTANT", types: ["NEW_MATCH"] } }], source), []);
  assert.deepEqual(newMatchAlerts([{ ...base, alerts: { enabled: true, frequency: "INSTANT", types: ["PRICE_DROP"] } }], source), []);
  assert.deepEqual(newMatchAlerts([{ ...base, seen: undefined, alerts: { enabled: true, frequency: "INSTANT", types: ["NEW_MATCH"] } }], source), []);
});
