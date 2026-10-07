import test from "node:test";
import assert from "node:assert/strict";
import { canAssignRole, hasPermission, type AppPermission } from "./roles";

const adminPermissions: AppPermission[] = [
  "admin.access",
  "users.manage",
  "users.changeRole",
  "listings.moderate",
  "verification.review",
  "reports.moderate",
  "enquiries.manage",
  "visits.manage",
  "payments.view",
  "subscriptions.manage",
  "services.manage",
  "analytics.view",
  "settings.view",
  "audit.view",
];

const ownerOnlyAdministrativePermissions: AppPermission[] = [
  "users.assignAdmin",
  "payments.refund",
  "plans.edit",
  "settings.edit",
];

test("OWNER retains every normal ADMIN permission", () => {
  for (const permission of adminPermissions) {
    assert.equal(hasPermission("OWNER", permission), true, permission);
  }
});

test("OWNER has administrative powers that normal ADMIN does not", () => {
  for (const permission of ownerOnlyAdministrativePermissions) {
    assert.equal(hasPermission("OWNER", permission), true, permission);
    assert.equal(hasPermission("ADMIN", permission), false, permission);
  }
});

test("OWNER may assign privileged roles while ADMIN cannot", () => {
  assert.equal(canAssignRole("OWNER", "ADMIN", "USER"), true);
  assert.equal(canAssignRole("OWNER", "SUPER_ADMIN", "USER"), true);
  assert.equal(canAssignRole("ADMIN", "ADMIN", "USER"), false);
  assert.equal(canAssignRole("ADMIN", "SUPER_ADMIN", "USER"), false);
});

test("OWNER cannot transfer the OWNER role itself", () => {
  assert.equal(canAssignRole("OWNER", "OWNER", "USER"), false);
  assert.equal(canAssignRole("OWNER", "ADMIN", "OWNER"), false);
});
