import { describe, expect, it } from "vitest";
import { propertyContactRedirect } from "./property-contact";

describe("propertyContactRedirect", () => {
  it("returns the property route with contact intent", () => {
    expect(propertyContactRedirect("3bhk-apartment-nagpur")).toBe(
      "/property/3bhk-apartment-nagpur?contact=true",
    );
  });

  it("safely encodes a slug before putting it in the redirect", () => {
    expect(propertyContactRedirect("home with spaces")).toBe(
      "/property/home%20with%20spaces?contact=true",
    );
  });
});
