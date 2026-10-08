import test from "node:test";
import assert from "node:assert/strict";
import { getFreeOfferState } from "./subscription-offer.ts";

test("unclaimed accounts can see the one-time free offer", () => {
  assert.deepEqual(getFreeOfferState(false), {
    claimed: false,
    showClaim: true,
    badge: false,
  });
});

test("claimed accounts cannot see the claim action and receive the verified badge", () => {
  assert.deepEqual(getFreeOfferState(true), {
    claimed: true,
    showClaim: false,
    badge: true,
  });
});
