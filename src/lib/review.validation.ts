export type ReviewInput = { rating: number; comment: string };

export type NormalizedReview = { rating: number; comment: string | null };

export function normalizeReview(input: ReviewInput): NormalizedReview {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const comment = input.comment.trim();
  if (comment.length > 1000) {
    throw new Error("Review comment must be 1000 characters or less.");
  }

  return { rating: input.rating, comment: comment || null };
}
