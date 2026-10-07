import test from "node:test";
import assert from "node:assert/strict";
import { canAssignRole, hasPermission, type AppPermission } from "./roles.ts";

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
test("Admin appointment requires active account, complete personal details, verified identity, and explicit confirmation", async () => {
  const { isVerifiedAdminCandidate } = await import("./roles.ts");
  assert.equal(isVerifiedAdminCandidate({targetRole:"USER",targetStatus:"ACTIVE",hasPersonalDetails:true,identityVerified:true,confirmed:true}),true);
  assert.equal(isVerifiedAdminCandidate({targetRole:"USER",targetStatus:"ACTIVE",hasPersonalDetails:false,identityVerified:true,confirmed:true}),false);
  assert.equal(isVerifiedAdminCandidate({targetRole:"USER",targetStatus:"ACTIVE",hasPersonalDetails:true,identityVerified:false,confirmed:true}),false);
  assert.equal(isVerifiedAdminCandidate({targetRole:"USER",targetStatus:"ACTIVE",hasPersonalDetails:true,identityVerified:true,confirmed:false}),false);
  assert.equal(isVerifiedAdminCandidate({targetRole:"USER",targetStatus:"SUSPENDED",hasPersonalDetails:true,identityVerified:true,confirmed:true}),false);
});


test("dashboard boundaries stay separate by role", async () => {
  const { AREA_ROLES } = await import("./roles.ts");
  assert.deepEqual(AREA_ROLES.dashboard, ["USER"]);
  assert.deepEqual(AREA_ROLES.owner, ["OWNER"]);
  assert.deepEqual(AREA_ROLES.admin, ["OWNER", "ADMIN"]);
});
