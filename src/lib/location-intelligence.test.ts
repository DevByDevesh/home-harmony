import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, withinRadius } from "./location-intelligence";

test("distanceKm returns zero for the same coordinate", () => {
  assert.equal(distanceKm({ lat: 21.1458, lng: 79.0882 }, { lat: 21.1458, lng: 79.0882 }), 0);
});

test("distanceKm measures the known approximate distance between two points", () => {
  const distance = distanceKm({ lat: 21.1458, lng: 79.0882 }, { lat: 21.1418, lng: 79.066 });
  assert.ok(distance > 2.2 && distance < 2.5);
});

test("withinRadius keeps points at or inside the requested radius and sorts nearest first", () => {
  const origin = { lat: 21.1458, lng: 79.0882 };
  const points = [
    { id: "far", lat: 21.12, lng: 79.02 },
    { id: "near", lat: 21.144, lng: 79.09 },
    { id: "edge", lat: 21.1418, lng: 79.066 },
  ];

  assert.deepEqual(withinRadius(points, origin, 3).map(point => point.id), ["near", "edge"]);
});
