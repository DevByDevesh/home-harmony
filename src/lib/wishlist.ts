import type { Listing } from "./catalog";

/** Splits saved/compared slugs into currently live listings and stale references. */
export function splitLiveSlugs(slugs: string[], live: Listing[]) {
  const liveBySlug = new Map(live.map(item => [item.slug, item]));
  return {
    available: slugs.map(slug => liveBySlug.get(slug)).filter((item): item is Listing => !!item),
    unavailable: slugs.filter(slug => !liveBySlug.has(slug)),
  };
}
