import test from "node:test";
import assert from "node:assert/strict";

test("property contact redirect keeps the property and contact intent", async () => {
  const { propertyContactRedirect } = await import("./property-contact.ts");
  assert.equal(
    propertyContactRedirect("3bhk-apartment-nagpur"),
    "/property/3bhk-apartment-nagpur?contact=true",
  );
});

test("property contact redirect safely encodes the slug", async () => {
  const { propertyContactRedirect } = await import("./property-contact.ts");
  assert.equal(
    propertyContactRedirect("home with spaces"),
    "/property/home%20with%20spaces?contact=true",
  );
});
