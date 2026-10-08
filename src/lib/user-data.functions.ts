/**
 * Seeker data (saved homes, compare, saved searches, visits) backed by PostgreSQL.
 * The user id always comes from the session; ids sent by the browser are only matched
 * together with that user id, so nobody can read or change someone else's data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Filters } from "./filters";
import type { AlertSettings } from "./alerts";
import type { Visit } from "./visits";

export type ServerSavedSearch = { id: string; label: string; filters: Filters; createdAt: string; alerts: AlertSettings; seen?: string[] };
export type ServerUserData = { saved: string[]; compare: string[]; recent: string[]; searches: ServerSavedSearch[]; visits: Visit[] };

function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }
async function me() { const { requireUser } = await import("./auth/guards.server"); return requireUser(); }
async function repo() { return import("./db/repositories/user-data.server"); }
const slug = z.string().min(1).max(120);
const uid = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const not = (msg: string) => ({ ok: false as const, message: msg });

/** Returns null when signed out (the browser then keeps device-only demo data). */
export const getMyUserDataFn = createServerFn({ method: "GET" }).handler(async (): Promise<ServerUserData | null> => {
  try {
    const { getSessionUser } = await import("./auth/guards.server");
    const u = await getSessionUser();
    if (!u) return null;
    const [s, recent] = await Promise.all([(await repo()).getUserDataSnapshot(u.id), (await import("./db/repositories/engagement.server")).getRecent(u.id)]);
    return {
      recent,
      saved: s.saved.map((x) => x.property.slug),
      compare: s.comparison?.properties.map((x) => x.property.slug) ?? [],
      searches: s.searches.map((x) => {
        const c = (x.criteria ?? {}) as { filters?: Filters; seen?: string[] };
        return { id: x.id, label: x.name, filters: c.filters ?? ({} as Filters), createdAt: x.createdAt.toISOString(), ...(c.seen ? { seen: c.seen } : {}),
          alerts: { enabled: x.alertEnabled, frequency: x.alertFrequency, types: (Array.isArray(x.alertTypes) ? x.alertTypes : []) as AlertSettings["types"] } };
      }),
      visits: s.visits.map((v) => ({ id: v.id, slug: v.property.slug, date: v.requestedDate.toISOString().slice(0, 10), slot: v.requestedTime, note: v.notes ?? undefined, status: v.status, createdAt: v.createdAt.toISOString() })),
    };
  } catch (e) { rethrow(e); }
});

export const setSavedFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug, saved: z.boolean() }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me(); const r = await repo();
      const id = (await r.resolveSlugs([data.slug])).get(data.slug);
      if (!id) return not("This home isn’t available.");
      if (data.saved) await r.saveProperty(u.id, id); else await r.unsaveProperty(u.id, id);
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

export const setCompareFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slugs: z.array(slug).max(4) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me(); const r = await repo();
      const slugs = [...new Set(data.slugs)]; const map = await r.resolveSlugs(slugs);
      await r.setUserComparison(u.id, slugs.map((s) => map.get(s)).filter((x): x is string => !!x));
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

const filters = z.record(z.string(), z.unknown()).refine((o) => JSON.stringify(o).length < 4000);
export const saveSearchFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: uid, label: z.string().trim().min(1).max(120), filters, seen: z.array(slug).max(500).optional(),
    alerts: z.object({ enabled: z.boolean(), frequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]), types: z.array(z.enum(["NEW_MATCH", "PRICE_DROP", "AVAILABILITY_CHANGE", "VERIFICATION_UPDATE"])).max(4) }),
  }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me();
      const ok = await (await repo()).upsertUserSearch(u.id, { id: data.id, name: data.label, criteria: { filters: data.filters, ...(data.seen ? { seen: data.seen } : {}) }, alertEnabled: data.alerts.enabled, alertFrequency: data.alerts.frequency, alertTypes: data.alerts.types });
      return ok ? { ok: true as const } : not("You can only change your own saved searches.");
    } catch (e) { rethrow(e); }
  });

export const deleteSearchFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: uid }).strict().parse(d))
  .handler(async ({ data }) => {
    try { const u = await me(); return (await (await repo()).deleteUserSearch(u.id, data.id)) ? { ok: true as const } : not("Saved search not found in your account."); }
    catch (e) { rethrow(e); }
  });

export const requestVisitFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: uid, slug, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), slot: z.string().regex(/^\d{2}:\d{2}$/), note: z.string().trim().max(500).optional() }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me(); const r = await repo();
      const pid = (await r.resolveSlugs([data.slug])).get(data.slug);
      if (!pid) return not("This home isn’t available for visits.");
      const v = await r.createUserVisit({ id: data.id, userId: u.id, propertyId: pid, date: data.date, time: data.slot, notes: data.note || null });
      if (!v) return not("This home isn’t available for visits.");
      await (await import("./db/repositories/engagement.server")).notifyVisitRequested(v.id);
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

export const cancelVisitFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: uid }).strict().parse(d))
  .handler(async ({ data }) => {
    try { const u = await me(); if (!(await (await repo()).cancelUserVisit(u.id, data.id))) return not("Visit not found in your account, or it can no longer be cancelled."); await (await import("./db/repositories/engagement.server")).notifyVisitCancelled(data.id); return { ok: true as const }; }
    catch (e) { rethrow(e); }
  });
