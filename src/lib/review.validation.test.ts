import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeReview } from "./review.validation.ts";

describe("normalizeReview", () => {
  it("accepts a 5-star review and trims the comment", () => {
    assert.deepEqual(
      normalizeReview({ rating: 5, comment: "  Great visit.  " }),
      { rating: 5, comment: "Great visit." },
    );
  });

  it("rejects ratings outside 1 to 5", () => {
    assert.throws(() => normalizeReview({ rating: 6, comment: "" }), /rating/i);
    assert.throws(() => normalizeReview({ rating: 0, comment: "" }), /rating/i);
  });

  it("allows an empty comment", () => {
    assert.deepEqual(normalizeReview({ rating: 4, comment: "   " }), { rating: 4, comment: null });
  });

  it("rejects comments longer than 1000 characters", () => {
    assert.throws(() => normalizeReview({ rating: 4, comment: "x".repeat(1001) }), /1000/);
  });
});
