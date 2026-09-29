import { useEffect, useState, useSyncExternalStore } from "react";

/** Tiny device-local store. Each store is a seam: swap load/persist for API calls when a backend exists. */
export function createLocalStore<T>(key: string, initial: () => T) {
  let state: T = initial(); let loaded = false;
  const listeners = new Set<() => void>();
  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try { const raw = window.localStorage.getItem(key); if (raw) state = { ...initial(), ...JSON.parse(raw) }; } catch { state = initial(); }
  }
  function get() { load(); return state; }
  function update(fn: (s: T) => T): boolean {
    load(); state = fn(state); listeners.forEach(l => l());
    try { window.localStorage.setItem(key, JSON.stringify(state)); return true; } catch { return false; }
  }
  const server = initial();
  function use() {
    const data = useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, get, () => server);
    const [ready, setReady] = useState(false);
    useEffect(() => setReady(true), []);
    return { data: ready ? data : server, ready };
  }
  return { get, update, use, reset: () => update(() => initial()) };
}
export const uid = () => Math.random().toString(36).slice(2, 10);

export function timeAgo(iso: string, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60); if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24); return `${days} day${days === 1 ? "" : "s"} ago`;
}
