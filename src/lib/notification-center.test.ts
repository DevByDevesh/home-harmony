import test from "node:test";
import assert from "node:assert/strict";
import { NOTIFICATION_TYPES, notificationTypeLabel } from "./notification-center.ts";

test("covers every launch notification category", () => {
  assert.equal(NOTIFICATION_TYPES.length, 13);
  for (const type of NOTIFICATION_TYPES) {
    assert.notEqual(notificationTypeLabel(type), "HouseProvider update");
  }
});

test("falls back safely for unknown notification types", () => {
  assert.equal(notificationTypeLabel("FUTURE_EVENT"), "HouseProvider update");
});
