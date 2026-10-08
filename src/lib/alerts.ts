import { applyFilters, type Filters } from "./filters.ts";
import type { Listing } from "./catalog.ts";

/**
 * Saved-search alert architecture. Settings travel with the search (device, and the
 * account when signed in); matching always runs against a caller-supplied source —
 * the live listings read from the database — never a fictional catalog.
 * A notification backend would evaluate the same rules server-side and deliver by email/push.
 */
export type AlertType = "NEW_MATCH" | "PRICE_DROP" | "AVAILABILITY_CHANGE" | "VERIFICATION_UPDATE";
export type AlertFrequency = "INSTANT" | "DAILY" | "WEEKLY";
export type AlertSettings = { enabled: boolean; frequency: AlertFrequency; types: AlertType[] };
export type SavedSearchAlert = { id: string; label: string; filters: Filters; alerts: AlertSettings; seen?: string[] };
export type NewMatchAlert = { searchId: string; label: string; slugs: string[] };

export const alertTypes: { type: AlertType; label: string; how: string }[] = [
  { type: "NEW_MATCH", label: "New matches", how: "A new listing fits this search." },
  { type: "PRICE_DROP", label: "Price drops", how: "A matching home lowers its price." },
  { type: "AVAILABILITY_CHANGE", label: "Availability changes", how: "A matching home becomes available or is taken." },
  { type: "VERIFICATION_UPDATE", label: "Verification updates", how: "A matching home completes verification checks." },
];
export const frequencies: { value: AlertFrequency; label: string }[] = [{ value: "INSTANT", label: "Instant" }, { value: "DAILY", label: "Daily digest" }, { value: "WEEKLY", label: "Weekly digest" }];
export const defaultAlerts = (): AlertSettings => ({ enabled: true, frequency: "INSTANT", types: ["NEW_MATCH"] });

/** Which listings match the saved criteria right now. */
export function matchingSlugs(filters: Filters, source: Listing[]): string[] { return applyFilters(source, filters).map(l => l.slug); }

/** Which listings match now that did not when the search was last opened. */
export function newSinceSaved(filters: Filters, seen: string[] | undefined, source: Listing[]): string[] {
  if (!seen) return [];
  return matchingSlugs(filters, source).filter(s => !seen.includes(s));
}

/** Build in-app new-match notifications from the live listing set and saved-search baselines. */
export function newMatchAlerts(searches: SavedSearchAlert[], source: Listing[]): NewMatchAlert[] {
  return searches
    .filter(search => search.alerts.enabled && search.alerts.types.includes("NEW_MATCH"))
    .map(search => ({ searchId: search.id, label: search.label, slugs: newSinceSaved(search.filters, search.seen, source) }))
    .filter(alert => alert.slugs.length > 0);
}
