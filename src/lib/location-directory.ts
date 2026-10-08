const BASE_URL = "https://countriesnow.space/api/v0.1";

export type LocationDirectoryResponse<T> = {
  error: boolean;
  msg?: string;
  data: T;
};

const countryCache: { value: string[] | null; promise: Promise<string[]> | null } = { value: null, promise: null };
const stateCache = new Map<string, string[]>();
const cityCache = new Map<string, string[]>();

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error("Location data is temporarily unavailable.");
  const body = (await response.json()) as LocationDirectoryResponse<T>;
  if (body.error) throw new Error(body.msg || "Location data is temporarily unavailable.");
  return body.data;
}

export async function listCountries(): Promise<string[]> {
  if (countryCache.value) return countryCache.value;
  if (countryCache.promise) return countryCache.promise;
  countryCache.promise = request<Array<{ name?: string; country?: string }>>(`${BASE_URL}/countries/iso`)
    .then(rows => rows.map(row => row.name ?? row.country ?? "").filter(Boolean).sort((a, b) => a.localeCompare(b)))
    .then(rows => {
      countryCache.value = rows;
      return rows;
    })
    .finally(() => { countryCache.promise = null; });
  return countryCache.promise;
}

export async function listStates(country: string): Promise<string[]> {
  const key = country.trim();
  if (!key) return [];
  const cached = stateCache.get(key);
  if (cached) return cached;
  const payload = await request<{ states?: Array<{ name?: string }> }>(`${BASE_URL}/countries/states`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country: key }),
  });
  const states = (payload.states ?? []).map(row => row.name ?? "").filter(Boolean).sort((a, b) => a.localeCompare(b));
  stateCache.set(key, states);
  return states;
}

export async function listCities(country: string, state: string): Promise<string[]> {
  const countryKey = country.trim();
  const stateKey = state.trim();
  if (!countryKey || !stateKey) return [];
  const key = `${countryKey}::${stateKey}`;
  const cached = cityCache.get(key);
  if (cached) return cached;
  const rows = await request<string[]>(`${BASE_URL}/countries/state/cities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country: countryKey, state: stateKey }),
  });
  const cities = [...new Set(rows.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  cityCache.set(key, cities);
  return cities;
}

export function findExactLocation(options: string[], value: string): string | null {
  const normalized = value.trim().toLocaleLowerCase();
  return options.find(option => option.toLocaleLowerCase() === normalized) ?? null;
}
