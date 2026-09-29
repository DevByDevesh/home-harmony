import type { Listing } from "./catalog";

/**
 * Deterministic, explainable matching. Only criteria the person actually expressed are scored,
 * so a score is never shown without a reason. Replace this module with an ML/LLM scorer later —
 * callers only depend on MatchResult.
 */
export type MatchCriteria = { location?: string | undefined; max?: string | undefined; beds?: string | undefined; furnishing?: string | undefined; parking?: string | undefined; kind?: string | undefined; amenities?: string | undefined };
export type MatchReason = { met: boolean; label: string };
export type MatchResult = { score: number; reasons: MatchReason[] };

export function computeMatch(home: Listing, c: MatchCriteria): MatchResult | null {
  const reasons: MatchReason[] = [];
  const place = c.location?.trim().toLocaleLowerCase();
  if (place) reasons.push({ met: `${home.city} ${home.neighborhood}`.toLocaleLowerCase().includes(place), label: `In ${c.location}` });
  const max = Number(c.max);
  if (c.max && Number.isFinite(max)) reasons.push({ met: home.price <= max, label: home.price <= max ? "Within your budget" : "Above your budget" });
  const beds = Number(c.beds);
  if (c.beds && Number.isFinite(beds)) reasons.push({ met: beds >= 4 ? home.beds >= 4 : home.beds === beds, label: `${beds >= 4 ? "4+" : beds} BHK` });
  if (c.furnishing) reasons.push({ met: home.furnishing === c.furnishing, label: c.furnishing });
  if (c.parking) reasons.push({ met: home.parking > 0, label: home.parking > 0 ? "Parking listed" : "No parking listed" });
  if (c.kind) reasons.push({ met: home.kind === c.kind, label: c.kind });
  for (const a of (c.amenities ?? "").split(",").filter(Boolean)) reasons.push({ met: home.features.includes(a), label: a });
  if (reasons.length < 2) return null; // too little to say anything meaningful
  const score = Math.round((reasons.filter(r => r.met).length / reasons.length) * 100);
  return { score, reasons };
}
