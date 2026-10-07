import test from "node:test";
import assert from "node:assert/strict";
import { defaultGranularAdminPermissions, GRANULAR_ADMIN_PERMISSIONS, normaliseGranularAdminPermissions } from "./permissions.ts";

test("granular Admin defaults include operational management but exclude Admin/Owner management", () => {
  const permissions = defaultGranularAdminPermissions();
  assert.equal(permissions.includes("listings.moderate"), true);
  assert.equal(permissions.includes("users.manage"), true);
  assert.equal(permissions.includes("reports.moderate"), true);
  assert.equal(permissions.includes("analytics.view"), true);
  assert.equal(permissions.includes("users.assignAdmin"), false);
  assert.equal(permissions.includes("settings.edit"), false);
  assert.equal(permissions.length, GRANULAR_ADMIN_PERMISSIONS.length);
});

test("granular permission normalisation drops unknown or non-assignable permissions", () => {
  assert.deepEqual(normaliseGranularAdminPermissions(["users.manage", "users.assignAdmin", "owner.manage", "reports.moderate"]), ["users.manage", "reports.moderate"]);
});
