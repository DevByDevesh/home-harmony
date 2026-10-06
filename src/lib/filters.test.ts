import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listings } from "./catalog.ts";
import { applyFilters, clearFilters, mergeFilters } from "./filters.ts";

describe("property discovery filters", () => {
  it("filters by city and listing mode", () => {
    const result = applyFilters(listings, { city: "Pune", mode: "Rent" });
    assert.ok(result.length > 0);
    assert.ok(result.every((home) => home.city === "Pune" && home.mode === "Rent"));
  });

  it("supports 4+ BHK and minimum area", () => {
    const result = applyFilters(listings, { beds: "4", minArea: "2000" });
    assert.ok(result.length > 0);
    assert.ok(result.every((home) => home.beds >= 4 && home.area >= 2000));
  });

  it("filters by budget and required amenities", () => {
    const result = applyFilters(listings, { max: "35000", amenities: "Parking,Balcony" });
    assert.ok(result.length > 0);
    assert.ok(result.every((home) =>
      home.price <= 35000 &&
      home.features.includes("Parking") &&
      home.features.includes("Balcony"),
    ));
  });

  it("sorts prices in both directions", () => {
    const ascending = applyFilters(listings, { sort: "price-asc" });
    const descending = applyFilters(listings, { sort: "price-desc" });
    assert.ok(ascending.every((home, i) => i === 0 || ascending[i - 1].price <= home.price));
    assert.ok(descending.every((home, i) => i === 0 || descending[i - 1].price >= home.price));
  });

  it("clears filters while preserving view and sort", () => {
    assert.deepEqual(
      clearFilters({ city: "Pune", view: "map", sort: "price-asc" }),
      { view: "map", sort: "price-asc" },
    );
  });

  it("lets later filter values override earlier values", () => {
    assert.deepEqual(
      mergeFilters({ city: "Pune", mode: "Rent" }, { city: "Mumbai", mode: "Buy" }),
      { city: "Mumbai", mode: "Buy" },
    );
  });
});
