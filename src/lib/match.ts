import type { Listing } from "./catalog.ts";

/**
 * Match engine — deterministic and explainable.
 *   user preferences + search criteria → computeMatch → MatchResult (score + explanation)
 * Only criteria the person actually expressed are scored, and only listing fields that exist are read.
 * No commute, neighbourhood, safety or verification data is inferred. Replace this module with an
 * ML/LLM scorer later — callers only depend on MatchResult and criteriaFrom().
 */
type Opt = string | undefined;
export type MatchCriteria = { location?: Opt; city?: Opt; mode?: Opt; min?: Opt; max?: Opt; beds?: Opt; baths?: Opt; furnishing?: Opt; parking?: Opt; kind?: Opt; amenities?: Opt; available?: Opt };
export type MatchReason = { met: boolean; label: string; warning?: boolean };
export type MatchResult = { score: number; reasons: MatchReason[]; matched: string[]; unmatched: string[]; warnings: string[] };
export type MatchOutcome = { kind: "score"; result: MatchResult } | { kind: "insufficient"; count: number };

export const MIN_CRITERIA = 2;
const n = (v: Opt) => { const x = Number(v); return v && Number.isFinite(x) ? x : undefined; };
const rupees = (v: number) => `₹${v.toLocaleString("en-IN")}`;

/** Merge saved preferences with the live search. Search values win because they are more recent. */
export function criteriaFrom(prefs: { location: string; max: string; beds: string; furnishing: string; parking: boolean } | undefined, filters: MatchCriteria = {}): MatchCriteria {
  const out: MatchCriteria = {};
  if (prefs) { if (prefs.location) out.location = prefs.location; if (prefs.max) out.max = prefs.max; if (prefs.beds) out.beds = prefs.beds; if (prefs.furnishing) out.furnishing = prefs.furnishing; if (prefs.parking) out.parking = "1"; }
  for (const k of ["location", "city", "mode", "min", "max", "beds", "baths", "furnishing", "parking", "kind", "amenities", "available"] as const) { const v = filters[k]; if (v) out[k] = v; }
  return out;
}

export function evaluateMatch(home: Listing, c: MatchCriteria): MatchOutcome {
  const reasons: MatchReason[] = [];
  const add = (met: boolean, label: string, warning = false) => reasons.push({ met, label, warning });

  const place = c.location?.trim();
  if (place) {
    const inPlace = `${home.city} ${home.neighborhood}`.toLocaleLowerCase().includes(place.toLocaleLowerCase());
    if (inPlace) add(true, `In your preferred area (${place})`);
    else if (c.city && home.city === c.city) add(false, `In ${home.city}, but outside ${place}`, true);
    else add(false, `Not in ${place}`);
  }
  if (c.city && !(place && `${home.city} ${home.neighborhood}`.toLocaleLowerCase().includes(place.toLocaleLowerCase()))) add(home.city === c.city, home.city === c.city ? `In ${c.city}` : `Not in ${c.city}`);
  if (c.mode) add(home.mode === c.mode, home.mode === c.mode ? `For ${c.mode.toLowerCase()}` : `Listed for ${home.mode.toLowerCase()}, not ${c.mode.toLowerCase()}`);
  const max = n(c.max), min = n(c.min);
  if (max !== undefined) {
    if (home.price <= max) add(true, "Within your budget");
    else if (home.price <= max * 1.1) add(false, `Slightly above your budget (${rupees(home.price - max)} more)`, true);
    else add(false, "Above your budget");
  }
  if (min !== undefined) add(home.price >= min, home.price >= min ? `Above your ${rupees(min)} minimum` : `Below your ${rupees(min)} minimum`);
  const beds = n(c.beds);
  if (beds !== undefined) { const ok = beds >= 4 ? home.beds >= 4 : home.beds === beds; add(ok, ok ? `${home.beds} BHK` : `${home.beds} BHK, not ${beds >= 4 ? "4+" : beds} BHK`); }
  const baths = n(c.baths);
  if (baths !== undefined) add(home.baths >= baths, home.baths >= baths ? `${home.baths} bathrooms` : `Only ${home.baths} bathroom${home.baths === 1 ? "" : "s"} listed`);
  if (c.furnishing) {
    if (home.furnishing === c.furnishing) add(true, home.furnishing);
    else if (c.furnishing === "Fully furnished" && home.furnishing === "Semi furnished") add(false, "Semi furnished, not fully furnished", true);
    else add(false, `${home.furnishing}, not ${c.furnishing.toLowerCase()}`);
  }
  if (c.parking) add(home.parking > 0, home.parking > 0 ? "Parking listed" : "No parking listed");
  if (c.kind) add(home.kind === c.kind, home.kind === c.kind ? home.kind : `${home.kind}, not ${c.kind.toLowerCase()}`);
  for (const a of (c.amenities ?? "").split(",").filter(Boolean)) add(home.features.includes(a), home.features.includes(a) ? `${a} listed` : `${a} not listed`);
  if (c.available) add(!home.availableFrom, !home.availableFrom ? "Listed as available now" : `Listed from ${new Date(home.availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`, !!home.availableFrom);

  if (reasons.length < MIN_CRITERIA) return { kind: "insufficient", count: reasons.length };
  // Met = 1 point, near-miss (warning) = half a point, miss = 0. Same inputs always give the same score.
  const points = reasons.reduce((s, r) => s + (r.met ? 1 : r.warning ? 0.5 : 0), 0);
  return { kind: "score", result: {
    score: Math.round((points / reasons.length) * 100), reasons,
    matched: reasons.filter(r => r.met).map(r => r.label),
    warnings: reasons.filter(r => !r.met && r.warning).map(r => r.label),
    unmatched: reasons.filter(r => !r.met && !r.warning).map(r => r.label),
  } };
}

/** Back-compatible helper: a score only when there is enough to say something meaningful. */
export function computeMatch(home: Listing, c: MatchCriteria): MatchResult | null {
  const o = evaluateMatch(home, c); return o.kind === "score" ? o.result : null;
}

/** Plain-language summary built only from the result's own reasons. */
export function explainMatch(r: MatchResult): string {
  const parts = [`${r.matched.length} of ${r.reasons.length} of your criteria met`];
  if (r.warnings.length) parts.push(`${r.warnings.length} close`);
  if (r.unmatched.length) parts.push(`${r.unmatched.length} not met`);
  return parts.join(" · ");
}
