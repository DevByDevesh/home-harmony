import { listings } from "./catalog";
import { applyFilters, type Filters } from "./filters";

/**
 * Saved-search alert architecture. Settings are stored on this device; nothing is sent.
 * A notification backend would evaluate the same rules server-side and deliver by email/push.
 */
export type AlertType = "NEW_MATCH" | "PRICE_DROP" | "AVAILABILITY_CHANGE" | "VERIFICATION_UPDATE";
export type AlertFrequency = "INSTANT" | "DAILY" | "WEEKLY";
export type AlertSettings = { enabled: boolean; frequency: AlertFrequency; types: AlertType[] };

export const alertTypes: { type: AlertType; label: string; how: string }[] = [
  { type: "NEW_MATCH", label: "New matches", how: "A new listing fits this search." },
  { type: "PRICE_DROP", label: "Price drops", how: "A matching home lowers its price." },
  { type: "AVAILABILITY_CHANGE", label: "Availability changes", how: "A matching home becomes available or is taken." },
  { type: "VERIFICATION_UPDATE", label: "Verification updates", how: "A matching home completes verification checks." },
];
export const frequencies: { value: AlertFrequency; label: string }[] = [{ value: "INSTANT", label: "Instant" }, { value: "DAILY", label: "Daily digest" }, { value: "WEEKLY", label: "Weekly digest" }];
export const defaultAlerts = (): AlertSettings => ({ enabled: true, frequency: "DAILY", types: ["NEW_MATCH", "PRICE_DROP"] });

export function matchingSlugs(filters: Filters): string[] { return applyFilters(listings, filters).map(l => l.slug); }

/** On-device check: which listings match now that didn't when the search was saved. */
export function newSinceSaved(filters: Filters, seen: string[] | undefined): string[] {
  if (!seen) return [];
  return matchingSlugs(filters).filter(s => !seen.includes(s));
}
