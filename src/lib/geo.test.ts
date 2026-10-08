import test from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon } from "./geo.ts";

const square: [number, number][] = [[0,0],[10,0],[10,10],[0,10]];

test("pointInPolygon includes points inside and excludes points outside", () => {
  assert.equal(pointInPolygon([5,5], square), true);
  assert.equal(pointInPolygon([15,5], square), false);
});

test("pointInPolygon safely handles an incomplete polygon", () => {
  assert.equal(pointInPolygon([5,5], [[0,0],[10,0]]), true);
});
