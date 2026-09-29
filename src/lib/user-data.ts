import { useEffect, useState, useSyncExternalStore } from "react";
import type { Filters } from "./filters";
import type { Visit, VisitStatus } from "./visits";
import { COMPARE_LIMIT } from "./compare";
import { track } from "./analytics";

/**
 * Device-local user data for the demo. The same shape will come from an authenticated API later:
 * swap the load/persist functions for server calls and the hooks keep working.
 */
export type SavedSearch = { id: string; label: string; filters: Filters; createdAt: string };
export type Activity = { id: string; text: string; at: string };
export type Preferences = { location: string; max: string; beds: string; furnishing: string; parking: boolean };
export type UserData = { saved: string[]; compare: string[]; recent: string[]; visits: Visit[]; searches: SavedSearch[]; activity: Activity[]; preferences: Preferences };

const KEY = "houseprovider.demo.v1";
const empty: UserData = { saved: [], compare: [], recent: [], visits: [], searches: [], activity: [], preferences: { location: "", max: "", beds: "", furnishing: "", parking: false } };
let state = empty; let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = window.localStorage.getItem(KEY); if (raw) state = { ...empty, ...JSON.parse(raw) }; } catch { state = empty; }
}
function update(fn: (s: UserData) => UserData): boolean {
  load(); state = fn(state);
  listeners.forEach(l => l());
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}
const id = () => Math.random().toString(36).slice(2, 10);
const log = (s: UserData, text: string): Activity[] => [{ id: id(), text, at: new Date().toISOString() }, ...s.activity].slice(0, 30);

export function useUserData() {
  const data = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => { load(); return state; }, () => empty);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return { data: ready ? data : empty, ready };
}

export const userActions = {
  toggleSaved(slug: string, name: string) { load(); if (!state.saved.includes(slug)) track("PROPERTY_SAVE", slug); update(s => s.saved.includes(slug) ? { ...s, saved: s.saved.filter(x => x !== slug), activity: log(s, `Removed ${name} from saved`) } : { ...s, saved: [slug, ...s.saved], activity: log(s, `Saved ${name}`) }); },
  /** Returns false when the comparison is already full. */
  toggleCompare(slug: string): boolean {
    load();
    if (!state.compare.includes(slug) && state.compare.length >= COMPARE_LIMIT) return false;
    if (!state.compare.includes(slug)) track("PROPERTY_COMPARE", slug);
    update(s => ({ ...s, compare: s.compare.includes(slug) ? s.compare.filter(x => x !== slug) : [...s.compare, slug] }));
    return true;
  },
  clearCompare() { update(s => ({ ...s, compare: [] })); },
  viewed(slug: string) { track("PROPERTY_VIEW", slug); update(s => ({ ...s, recent: [slug, ...s.recent.filter(x => x !== slug)].slice(0, 12) })); },
  requestVisit(v: Omit<Visit, "id" | "status" | "createdAt">, name: string): boolean {
    track("VISIT_REQUEST", v.slug);
    return update(s => ({ ...s, visits: [{ ...v, id: id(), status: "REQUESTED", createdAt: new Date().toISOString() }, ...s.visits], activity: log(s, `Visit request saved for ${name}`) }));
  },
  setVisitStatus(visitId: string, status: VisitStatus) { update(s => ({ ...s, visits: s.visits.map(v => v.id === visitId ? { ...v, status } : v), activity: log(s, `Visit ${status.toLowerCase()}`) })); },
  saveSearch(label: string, filters: Filters) { track("SEARCH"); update(s => ({ ...s, searches: [{ id: id(), label, filters, createdAt: new Date().toISOString() }, ...s.searches], activity: log(s, `Saved search “${label}”`) })); },
  removeSearch(searchId: string) { update(s => ({ ...s, searches: s.searches.filter(x => x.id !== searchId) })); },
  setPreferences(p: Preferences) { update(s => ({ ...s, preferences: p, activity: log(s, "Updated preferences") })); },
  reset() { update(() => empty); },
};
