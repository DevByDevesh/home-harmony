import test from "node:test";
import assert from "node:assert/strict";
import { LISTING_ROLES } from "./auth/roles.ts";
import { formatDisplayPrice } from "./price-format.ts";

test("listing access includes regular users and owners but not admin-only accounts", () => {
  assert.deepEqual(LISTING_ROLES, ["USER", "OWNER"]);
  assert.ok(LISTING_ROLES.includes("USER"));
  assert.ok(LISTING_ROLES.includes("OWNER"));
  assert.ok(!LISTING_ROLES.includes("ADMIN" as (typeof LISTING_ROLES)[number]));
});

test("sale price formatting stays in lakh until one crore", () => {
  assert.equal(formatDisplayPrice("Buy", 1_000_000), "₹10.00 Lakh");
  assert.equal(formatDisplayPrice("Buy", 5_000_000), "₹50.00 Lakh");
  assert.equal(formatDisplayPrice("Buy", 10_000_000), "₹1.00 Cr");
  assert.equal(formatDisplayPrice("Buy", 31_500_000), "₹3.15 Cr");
});

test("rent prices remain plain INR amounts", () => {
  assert.equal(formatDisplayPrice("Rent", 3000), "₹3,000");
  assert.equal(formatDisplayPrice("Rent", 138000), "₹1,38,000");
});

test("invalid display prices never produce NaN or Infinity", () => {
  assert.equal(formatDisplayPrice("Buy", Number.NaN), "₹0");
  assert.equal(formatDisplayPrice("Buy", -1), "₹0");
});
