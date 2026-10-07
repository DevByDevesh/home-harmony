import test from "node:test";
import assert from "node:assert/strict";

test("Admin analytics scope exposes only metrics granted by permissions", async () => {
  const { adminAnalyticsScope } = await import("./analytics.ts");
  assert.deepEqual(adminAnalyticsScope(["analytics.view"]), {
    listings: true, moderation: true, enquiries: true, visits: true,
    users: false, payments: false, subscriptions: false, services: false, audit: false,
  });
  assert.deepEqual(adminAnalyticsScope([
    "analytics.view", "users.manage", "payments.view", "subscriptions.manage", "services.manage", "audit.view",
  ]), {
    listings: true, moderation: true, enquiries: true, visits: true,
    users: true, payments: true, subscriptions: true, services: true, audit: true,
  });
});

test("Admin analytics never exposes Owner-only management permissions", async () => {
  const { adminAnalyticsScope } = await import("./analytics.ts");
  assert.equal(adminAnalyticsScope(["users.assignAdmin", "payments.refund", "plans.edit", "settings.edit"]).users, false);
});
