import test from "node:test";
import assert from "node:assert/strict";
import { hasPublishablePhotos } from "./listing-publication.ts";

test("requires at least one stored photo", () => {
  assert.equal(hasPublishablePhotos(0), false);
  assert.equal(hasPublishablePhotos(1), true);
  assert.equal(hasPublishablePhotos(5), true);
  assert.equal(hasPublishablePhotos(Number.NaN), false);
});
