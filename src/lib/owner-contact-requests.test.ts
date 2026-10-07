import test from "node:test";
import assert from "node:assert/strict";

test("owner contact request states allow only requested -> accepted/rejected", async () => {
  const { canTransitionContactRequest } = await import("./owner-contact-requests.ts");
  assert.equal(canTransitionContactRequest("REQUESTED", "ACCEPTED"), true);
  assert.equal(canTransitionContactRequest("REQUESTED", "REJECTED"), true);
  assert.equal(canTransitionContactRequest("ACCEPTED", "REJECTED"), false);
  assert.equal(canTransitionContactRequest("REJECTED", "ACCEPTED"), false);
});

test("call requests require a future preferred date and time", async () => {
  const { validateCallPreference } = await import("./owner-contact-requests.ts");
  assert.equal(validateCallPreference("2099-12-31", "18:00"), true);
  assert.equal(validateCallPreference("not-a-date", "18:00"), false);
  assert.equal(validateCallPreference("2099-12-31", "99:99"), false);
});

test("phone numbers are revealable only after owner acceptance", async () => {
  const { canRevealOwnerPhone } = await import("./owner-contact-requests.ts");
  assert.equal(canRevealOwnerPhone("REQUESTED"), false);
  assert.equal(canRevealOwnerPhone("REJECTED"), false);
  assert.equal(canRevealOwnerPhone("ACCEPTED"), true);
});
