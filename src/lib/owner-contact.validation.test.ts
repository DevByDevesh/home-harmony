import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeOwnerContact } from "./owner-contact.validation.ts";

describe("normalizeOwnerContact", () => {
  it("normalizes a valid Indian mobile number and WhatsApp preference", () => {
    assert.deepEqual(
      normalizeOwnerContact({ phone: " +91 98765-43210 ", preferredContact: "WHATSAPP" }),
      { phone: "+919876543210", preferredContact: "WHATSAPP" },
    );
  });

  it("accepts both call and WhatsApp as a combined preference", () => {
    assert.deepEqual(
      normalizeOwnerContact({ phone: "9876543210", preferredContact: "BOTH" }),
      { phone: "+919876543210", preferredContact: "BOTH" },
    );
  });

  it("rejects malformed phone numbers", () => {
    assert.throws(
      () => normalizeOwnerContact({ phone: "12345", preferredContact: "CALL" }),
      /valid phone number/i,
    );
  });

  it("allows clearing contact details", () => {
    assert.deepEqual(
      normalizeOwnerContact({ phone: "", preferredContact: null }),
      { phone: null, preferredContact: null },
    );
  });
});
