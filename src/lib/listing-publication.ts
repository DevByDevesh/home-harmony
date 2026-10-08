/** A listing needs at least one stored photo before it can be live. */
export function hasPublishablePhotos(photoCount: number): boolean {
  return Number.isFinite(photoCount) && photoCount >= 1;
}
