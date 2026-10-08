import { useEffect, useState, useSyncExternalStore } from "react";
import type { Filters } from "./filters";
import type { Visit, VisitStatus } from "./visits";
import { COMPARE_LIMIT } from "./compare";
import { track } from "./analytics";
import { defaultAlerts, matchingSlugs, type AlertSettings } from "./alerts";
import type { Listing } from "./catalog";
import { toast } from "sonner";
import { useCurrentUser } from "./auth/use-current-user";
import { cancelVisitFn, deleteSearchFn, getMyUserDataFn, requestVisitFn, saveSearchFn, setCompareFn, setSavedFn } from "./user-data.functions";
import { setRecentFn } from "./engagement.functions";

/**
 * User data. Signed out: device-local demo. Signed in: saved homes, compare, saved searches and
 * visits are loaded from and written to the account (server enforces ownership); recent views,
 * activity and preferences stay on the device.
 * Original note — device-local user data for the demo. The same shape will come from an authenticated API later:
 * swap the load/persist functions for server calls and the hooks keep working.
 */
/** `alerts` and `seen` are optional so searches saved before alerts existed still load. */
export type SavedSearch = { id: string; label: string; filters: Filters; createdAt: string; alerts?: AlertSettings; seen?: string[] };
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
/** Signed-in user id when account data is active; device copy of the synced fields is kept aside, untouched. */
let serverUser: string | null = null;
let deviceCopy: Pick<UserData, "saved" | "compare" | "recent" | "visits" | "searches"> | null = null;
function persist(): boolean {
  const out = serverUser && deviceCopy ? { ...state, ...deviceCopy } : state;
  try { window.localStorage.setItem(KEY, JSON.stringify(out)); return true; } catch { return false; }
}
function update(fn: (s: UserData) => UserData): boolean {
  load(); state = fn(state);
  listeners.forEach(l => l());
  return persist();
}
function set(next: UserData) { state = next; listeners.forEach(l => l()); persist(); }
let syncing: Promise<void> | null = null;
/** Homes opened on this page load before account data arrived; added to the account list once it loads. */
let pendingViews: string[] = [];
/** Loads account data for the signed-in user, or restores device data after sign-out. */
async function syncAccount(userId: string | null) {
  load();
  if (!userId) { if (serverUser && deviceCopy) set({ ...state, ...deviceCopy }); serverUser = null; deviceCopy = null; pendingViews = []; return; }
  const d = await getMyUserDataFn();
  if (!d) return;
  if (!serverUser) deviceCopy = { saved: state.saved, compare: state.compare, recent: state.recent, visits: state.visits, searches: state.searches };
  serverUser = userId;
  const views = pendingViews; pendingViews = [];
  const recent = views.length ? [...views, ...d.recent.filter(x => !views.includes(x))].slice(0, 12) : d.recent;
  set({ ...state, saved: d.saved, compare: d.compare, recent, visits: d.visits, searches: d.searches });
  if (views.length) remote(setRecentFn({ data: { slugs: recent } }), () => {});
}
function resync() { if (serverUser) { const u = serverUser; syncing = syncAccount(u).catch(() => {}).finally(() => { syncing = null; }); } }
/** Sends a change to the account; on failure, reloads account data so the screen matches what's saved. */
function remote(p: Promise<{ ok: boolean; message?: string }>, onError?: (m: string) => void) {
  p.then(r => { if (!r.ok) { onError?.(r.message ?? "Couldn’t save to your account."); resync(); } })
   .catch((e: unknown) => { onError?.(e instanceof Error ? e.message : "Couldn’t save to your account."); resync(); });
}
let errorHandler: (m: string) => void = () => {};
/** Lets the UI show account save failures (wired to the toast in useUserData). */
export function onUserDataError(fn: (m: string) => void) { errorHandler = fn; }
const id = () => Math.random().toString(36).slice(2, 10);
const uuid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${id()}${id()}${id()}`);
/** Writes one saved search (label, filters, alert settings, seen list) to the account. */
function pushSearch(searchId: string) {
  if (!serverUser) return; const x = state.searches.find(s => s.id === searchId); if (!x) return;
  remote(saveSearchFn({ data: { id: x.id, label: x.label, filters: x.filters as Record<string, unknown>, ...(x.seen ? { seen: x.seen } : {}), alerts: x.alerts ?? defaultAlerts() } }), errorHandler);
}
const log = (s: UserData, text: string): Activity[] => [{ id: id(), text, at: new Date().toISOString() }, ...s.activity].slice(0, 30);

export function useUserData() {
  const data = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => { load(); return state; }, () => empty);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => onUserDataError(m => toast.error(m)), []);
  const { user, loading } = useCurrentUser();
  const uid = user?.id ?? null;
  useEffect(() => { if (!loading && uid !== serverUser && !syncing) syncing = syncAccount(uid).catch(() => {}).finally(() => { syncing = null; }); }, [uid, loading]);
  return { data: ready ? data : empty, ready };
}

export const userActions = {
  toggleSaved(slug: string, name: string) { load(); if (!state.saved.includes(slug)) track("PROPERTY_SAVE", slug); const on = !state.saved.includes(slug); update(s => s.saved.includes(slug) ? { ...s, saved: s.saved.filter(x => x !== slug), activity: log(s, `Removed ${name} from saved`) } : { ...s, saved: [slug, ...s.saved], activity: log(s, `Saved ${name}`) }); if (serverUser) remote(setSavedFn({ data: { slug, saved: on } }), errorHandler); },
  /** Returns false when the comparison is already full. */
  toggleCompare(slug: string): boolean {
    load();
    if (!state.compare.includes(slug) && state.compare.length >= COMPARE_LIMIT) return false;
    if (!state.compare.includes(slug)) track("PROPERTY_COMPARE", slug);
    update(s => ({ ...s, compare: s.compare.includes(slug) ? s.compare.filter(x => x !== slug) : [...s.compare, slug] }));
    if (serverUser) remote(setCompareFn({ data: { slugs: state.compare } }), errorHandler);
    return true;
  },
  clearCompare() { update(s => ({ ...s, compare: [] })); if (serverUser) remote(setCompareFn({ data: { slugs: [] } }), errorHandler); },
  viewed(slug: string) { track("PROPERTY_VIEW", slug); update(s => ({ ...s, recent: [slug, ...s.recent.filter(x => x !== slug)].slice(0, 12) })); if (serverUser) remote(setRecentFn({ data: { slugs: state.recent } }), () => {}); else pendingViews = [slug, ...pendingViews.filter(x => x !== slug)].slice(0, 12); },
  requestVisit(v: Omit<Visit, "id" | "status" | "createdAt">, name: string): boolean {
    track("VISIT_REQUEST", v.slug);
    const vid = uuid();
    const ok = update(s => ({ ...s, visits: [{ ...v, id: vid, status: "REQUESTED", createdAt: new Date().toISOString() }, ...s.visits], activity: log(s, `Visit request saved for ${name}`) }));
    if (serverUser) { remote(requestVisitFn({ data: { id: vid, slug: v.slug, date: v.date, slot: v.slot, ...(v.note ? { note: v.note } : {}) } }), errorHandler); return true; }
    return ok;
  },
  setVisitStatus(visitId: string, status: VisitStatus) { update(s => ({ ...s, visits: s.visits.map(v => v.id === visitId ? { ...v, status } : v), activity: log(s, `Visit ${status.toLowerCase()}`) })); if (serverUser && status === "CANCELLED") remote(cancelVisitFn({ data: { id: visitId } }), errorHandler); },
  /** `source` is the live listing set the search was run against; without it no baseline is recorded. */
  saveSearch(label: string, filters: Filters, source?: Listing[]) { track("SEARCH"); const x: SavedSearch = { id: uuid(), label, filters, createdAt: new Date().toISOString(), alerts: defaultAlerts(), ...(source ? { seen: matchingSlugs(filters, source) } : {}) }; update(s => ({ ...s, searches: [x, ...s.searches], activity: log(s, `Saved search “${label}”`) })); pushSearch(x.id); },
  updateSearch(searchId: string, patch: { label?: string; filters?: Filters; alerts?: AlertSettings }) { update(s => ({ ...s, searches: s.searches.map(x => x.id === searchId ? { ...x, ...patch } : x), activity: log(s, patch.alerts ? `Alert settings updated` : `Saved search edited`) })); pushSearch(searchId); },
  markSearchSeen(searchId: string, source?: Listing[]) { if (!source) return; update(s => ({ ...s, searches: s.searches.map(x => x.id === searchId ? { ...x, seen: matchingSlugs(x.filters, source) } : x) })); pushSearch(searchId); },
  removeSearch(searchId: string) { update(s => ({ ...s, searches: s.searches.filter(x => x.id !== searchId) })); if (serverUser) remote(deleteSearchFn({ data: { id: searchId } }), errorHandler); },
  setPreferences(p: Preferences) { update(s => ({ ...s, preferences: p, activity: log(s, "Updated preferences") })); },
  reset() { update(() => empty); },
};
