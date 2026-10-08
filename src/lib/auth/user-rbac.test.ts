import test from "node:test";
import assert from "node:assert/strict";
import { canAssignRole, hasPermission } from "./roles.ts";

test("USER has normal seeker capabilities", () => { for (const p of ["profile.manage","saved.manage","searches.manage","comparisons.manage","visits.own","enquiries.own","listings.own","verification.request"] as const) assert.equal(hasPermission("USER",p),true,p); });
test("USER cannot access platform administration", () => { for (const p of ["admin.access","users.manage","users.changeRole","users.assignAdmin","listings.moderate","verification.review","reports.moderate","enquiries.manage","visits.manage","payments.view","payments.refund","plans.edit","subscriptions.manage","services.manage","analytics.view","settings.view","settings.edit","audit.view"] as const) assert.equal(hasPermission("USER",p),false,p); });
test("USER cannot assign roles or escalate privileges", () => {
  assert.equal(canAssignRole("USER","USER","USER"),false);
  assert.equal(canAssignRole("USER","AGENT","USER"),false);
  assert.equal(canAssignRole("USER","ADMIN","USER"),false);
});
test("USER can only have listing ownership actions, never moderation actions", () => {
  assert.equal(hasPermission("USER","listings.own"),true);
  assert.equal(hasPermission("USER","listings.moderate"),false);
});
test("ADMIN has moderation access but cannot exercise OWNER privileges", () => {
  for (const p of ["admin.access","listings.moderate","verification.review","reports.moderate","users.manage","analytics.view"] as const) assert.equal(hasPermission("ADMIN",p),true,p);
  for (const p of ["users.assignAdmin","payments.refund","plans.edit","settings.edit"] as const) assert.equal(hasPermission("ADMIN",p),false,p);
});
test("ADMIN cannot create, promote, demote, or modify an OWNER account", () => {
  assert.equal(canAssignRole("ADMIN","OWNER","USER"),false);
  assert.equal(canAssignRole("ADMIN","ADMIN","OWNER"),false);
  assert.equal(canAssignRole("ADMIN","USER","OWNER"),false);
});
test("OWNER has full platform authority and can manage admin roles", () => {
  for (const p of ["admin.access","users.manage","users.changeRole","users.assignAdmin","listings.moderate","verification.review","reports.moderate","analytics.view","settings.view","settings.edit","payments.refund","plans.edit"] as const) assert.equal(hasPermission("OWNER",p),true,p);
  assert.equal(canAssignRole("OWNER","ADMIN","USER"),true);
  assert.equal(canAssignRole("OWNER","USER","ADMIN"),true);
  assert.equal(canAssignRole("OWNER","USER","USER"),true);
});
test("OWNER remains the highest role and cannot be transferred", () => {
  assert.equal(canAssignRole("OWNER","OWNER","USER"),false);
  assert.equal(canAssignRole("OWNER","ADMIN","OWNER"),false);
  assert.equal(hasPermission("OWNER","owner.access"),true);
  assert.equal(hasPermission("ADMIN","owner.access"),false);
});
