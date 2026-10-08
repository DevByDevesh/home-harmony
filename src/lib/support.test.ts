import test from "node:test";
import assert from "node:assert/strict";

test("support ticket statuses and categories match the customer support contract", async () => {
  const { SUPPORT_CATEGORIES, SUPPORT_STATUSES, SUPPORT_PRIORITIES } = await import("./support.ts");
  assert.deepEqual(SUPPORT_CATEGORIES, ["ACCOUNT", "LISTING", "PAYMENT", "ABUSE", "TECHNICAL", "OTHER"]);
  assert.deepEqual(SUPPORT_STATUSES, ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"]);
  assert.deepEqual(SUPPORT_PRIORITIES, ["LOW", "MEDIUM", "HIGH", "URGENT"]);
});

test("customer care contact flow is distinct from property-owner contact flow", async () => {
  const { SUPPORT_EMAIL, supportContactUrls } = await import("./support.ts");
  assert.equal(SUPPORT_EMAIL, "support@houseprovider.in");
  assert.equal(supportContactUrls("919999999999").whatsapp.includes("wa.me"), true);
  assert.equal(supportContactUrls("919999999999").call.includes("tel:"), true);
});
