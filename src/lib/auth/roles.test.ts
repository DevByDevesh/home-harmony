import test from "node:test";
import assert from "node:assert/strict";
import { canAssignRole, getRoleDashboardPath, hasPermission, type AppPermission } from "./roles.ts";

const adminPermissions: AppPermission[] = [
  "admin.access","users.manage","users.changeRole","listings.moderate","verification.review","reports.moderate",
  "enquiries.manage","visits.manage","payments.view","subscriptions.manage","services.manage","analytics.view","settings.view","audit.view",
];
const ownerOnlyAdministrativePermissions: AppPermission[] = ["users.assignAdmin","payments.refund","plans.edit","settings.edit"];

test("OWNER retains every normal ADMIN permission", () => { for (const permission of adminPermissions) assert.equal(hasPermission("OWNER", permission), true, permission); });
test("OWNER has administrative powers that normal ADMIN does not", () => { for (const permission of ownerOnlyAdministrativePermissions) { assert.equal(hasPermission("OWNER", permission), true, permission); assert.equal(hasPermission("ADMIN", permission), false, permission); } });
test("only OWNER may appoint or remove ADMIN accounts", () => {
  assert.equal(canAssignRole("OWNER","ADMIN","USER"),true);
  assert.equal(canAssignRole("ADMIN","ADMIN","USER"),false);
  assert.equal(canAssignRole("OWNER","USER","ADMIN"),true);
  assert.equal(canAssignRole("ADMIN","USER","ADMIN"),false);
});
test("OWNER cannot transfer the OWNER role itself", () => {
  assert.equal(canAssignRole("OWNER","OWNER","USER"),false);
  assert.equal(canAssignRole("OWNER","ADMIN","OWNER"),false);
});
test("Owner can appoint Admin without personal-detail or identity-verification checks", () => {
  assert.equal(canAssignRole("OWNER", "ADMIN", "USER"), true);
});


test("account dashboard CTA points each role to its permitted dashboard", () => {
  assert.equal(getRoleDashboardPath("USER"), "/dashboard");
  assert.equal(getRoleDashboardPath("ADMIN"), "/admin");
  assert.equal(getRoleDashboardPath("OWNER"), "/owner");
});

test("authenticated-only routes accept every signed-in role without widening the user dashboard", async () => {
  const { AREA_ROLES } = await import("./roles.ts");
  assert.deepEqual(AREA_ROLES.authenticated, ["USER", "OWNER", "AGENT", "PROPERTY_MANAGER", "ADMIN"]);
});

test("dashboard boundaries stay separate by role", async () => {
  const { AREA_ROLES } = await import("./roles.ts");
  assert.deepEqual(AREA_ROLES.dashboard, ["USER"]);
  assert.deepEqual(AREA_ROLES.owner, ["OWNER"]);
  assert.deepEqual(AREA_ROLES.admin, ["OWNER", "ADMIN"]);
});
