import { cities, listings } from "./catalog";

const KEY = "houseprovider.recent-searches.v1";

export function pushRecentSearch(items: string[], value: string, limit = 8): string[] {
  const clean = value.trim();
  if (!clean) return items.slice(0, limit);
  return [clean, ...items.filter(x => x.toLocaleLowerCase() !== clean.toLocaleLowerCase())].slice(0, limit);
}

export function buildSearchSuggestions(query: string, recent: string[] = [], locations: string[] = []): string[] {
  const q = query.trim().toLocaleLowerCase();
  const pool = [...recent, ...locations, ...cities, ...listings.map(x => x.neighborhood)];
  const unique = [...new Map(pool.map(x => [x.toLocaleLowerCase(), x])).values()];
  if (!q) return unique.slice(0, 8);
  return unique.filter(x => x.toLocaleLowerCase().includes(q)).slice(0, 8);
}

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]).filter(x => typeof x === "string") : [];
  } catch { return []; }
}

export function rememberRecentSearch(value: string): string[] {
  const next = pushRecentSearch(readRecentSearches(), value);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}
