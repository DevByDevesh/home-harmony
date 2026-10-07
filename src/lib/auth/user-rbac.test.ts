import test from "node:test";
import assert from "node:assert/strict";
import { canAssignRole, hasPermission } from "./roles";

test("USER has normal seeker capabilities", () => {
  for (const permission of [
    "profile.manage",
    "saved.manage",
    "searches.manage",
    "comparisons.manage",
    "visits.own",
    "enquiries.own",
    "listings.own",
    "verification.request",
  ] as const) {
    assert.equal(hasPermission("USER", permission), true, permission);
  }
});

test("USER cannot access platform administration", () => {
  for (const permission of [
    "admin.access",
    "users.manage",
    "users.changeRole",
    "users.assignAdmin",
    "listings.moderate",
    "verification.review",
    "reports.moderate",
    "enquiries.manage",
    "visits.manage",
    "payments.view",
    "payments.refund",
    "plans.edit",
    "subscriptions.manage",
    "services.manage",
    "analytics.view",
    "settings.view",
    "settings.edit",
    "audit.view",
  ] as const) {
    assert.equal(hasPermission("USER", permission), false, permission);
  }
});

test("USER cannot assign roles or escalate privileges", () => {
  assert.equal(canAssignRole("USER", "USER", "USER"), false);
  assert.equal(canAssignRole("USER", "AGENT", "USER"), false);
  assert.equal(canAssignRole("USER", "ADMIN", "USER"), false);
  assert.equal(canAssignRole("USER", "SUPER_ADMIN", "USER"), false);
});

test("USER can only have listing ownership actions, never moderation actions", () => {
  assert.equal(hasPermission("USER", "listings.own"), true);
  assert.equal(hasPermission("USER", "listings.moderate"), false);
});
