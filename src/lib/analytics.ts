import { createLocalStore, uid } from "./local-store";

/** Event concepts shared with the future analytics backend. Events here are recorded on this device only. */
export type AnalyticsEventType = "PROPERTY_VIEW" | "PROPERTY_SAVE" | "PROPERTY_COMPARE" | "SEARCH" | "ENQUIRY" | "VISIT_REQUEST" | "LISTING_CREATED" | "LISTING_PUBLISHED";
export type AnalyticsEvent = { id: string; type: AnalyticsEventType; at: string; subject?: string | undefined };
export const eventLabels: Record<AnalyticsEventType, string> = {
  PROPERTY_VIEW: "Property views", PROPERTY_SAVE: "Saves", PROPERTY_COMPARE: "Compare adds", SEARCH: "Searches saved",
  ENQUIRY: "Enquiries", VISIT_REQUEST: "Visit requests", LISTING_CREATED: "Drafts started", LISTING_PUBLISHED: "Listings submitted",
};

const store = createLocalStore<{ events: AnalyticsEvent[] }>("houseprovider.analytics.v1", () => ({ events: [] }));
/** Replace the body with a POST to an analytics endpoint later; callers stay the same. */
export function track(type: AnalyticsEventType, subject?: string) {
  if (typeof window === "undefined") return;
  store.update(s => ({ events: [{ id: uid(), type, at: new Date().toISOString(), subject }, ...s.events].slice(0, 500) }));
}
export const useLocalEvents = () => store.use();
export function countByType(events: AnalyticsEvent[]) {
  const out = {} as Record<AnalyticsEventType, number>;
  (Object.keys(eventLabels) as AnalyticsEventType[]).forEach(t => { out[t] = 0; });
  events.forEach(e => { out[e.type] += 1; });
  return out;
}

export type SeriesPoint = { label: string; value: number };
/** Real daily counts from record timestamps (0-filled), over the last `days` days. Never fabricates data. */
export function dailyCounts(rows: { createdAt: string }[], days = 30): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const r of rows) { const k = r.createdAt.slice(0, 10); byDay.set(k, (byDay.get(k) ?? 0) + 1); }
  const out: SeriesPoint[] = []; const today = new Date();
  for (let i = days - 1; i >= 0; i--) { const dt = new Date(today); dt.setDate(today.getDate() - i); const k = dt.toISOString().slice(0, 10); out.push({ label: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), value: byDay.get(k) ?? 0 }); }
  return out;
}
export const total = (s: SeriesPoint[]) => s.reduce((n, p) => n + p.value, 0);
export const rate = (num: number, den: number) => den ? `${((num / den) * 100).toFixed(1)}%` : "—";
