/** Agent CRM (leads, clients, follow-ups) backed by PostgreSQL. Agent identity always comes from the session. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Lead } from "./agent-data";

function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }
async function agent() { const { requirePermission } = await import("./auth/guards.server"); return requirePermission("leads.manage"); }
async function repo() { return import("./db/repositories/agent-crm.server"); }
const id = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const today = () => new Date().toISOString().slice(0, 10);
const denied = { ok: false as const, message: "This lead isn’t assigned to you." };

/** Returns null for non-agents so the page keeps its demo pipeline. */
export const listMyLeadsFn = createServerFn({ method: "GET" }).handler(async (): Promise<Lead[] | null> => {
  try {
    const { getSessionUser } = await import("./auth/guards.server");
    const { hasPermission } = await import("./auth/roles");
    const u = await getSessionUser();
    if (!u || !hasPermission(u.role, "leads.manage")) return null;
    const r = await repo();
    return (await r.listAgentLeads(u.id)).map((e) => {
      const c = r.readCrm(e.notes);
      return { id: e.id, name: e.user.name.split(" ")[0] || "Seeker", propertySlug: e.property.slug, propertyTitle: e.property.title, budget: "Not shared", location: `${e.property.locality}, ${e.property.city}`, status: c.stage, lastContact: c.lastContact, nextFollowUp: c.followUp?.status === "OPEN" ? c.followUp.date : null, followUpNote: c.followUp?.note ?? null, notes: c.notes };
    });
  } catch (e) { rethrow(e); }
});

export const setLeadStageFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, stage: z.enum(["NEW", "CONTACTED", "INTERESTED", "VISIT_SCHEDULED", "NEGOTIATION", "CONVERTED", "LOST"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try { const u = await agent(); return (await (await repo()).updateAgentLead(u.id, data.id, (c) => ({ ...c, stage: data.stage, lastContact: data.stage === "NEW" ? c.lastContact : today() }))) ? { ok: true as const } : denied; }
    catch (e) { rethrow(e); }
  });

export const addLeadNoteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, text: z.string().trim().min(1).max(500) }).strict().parse(d))
  .handler(async ({ data }) => {
    try { const u = await agent(); return (await (await repo()).updateAgentLead(u.id, data.id, (c) => ({ ...c, notes: [{ id: crypto.randomUUID(), text: data.text, at: new Date().toISOString() }, ...c.notes].slice(0, 100) }))) ? { ok: true as const } : denied; }
    catch (e) { rethrow(e); }
  });

/** Create/update (date + optional note), mark done, or clear a follow-up. */
export const setFollowUpFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), status: z.enum(["OPEN", "DONE"]).optional(), note: z.string().trim().max(300).optional() }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await agent();
      const ok = await (await repo()).updateAgentLead(u.id, data.id, (c) => ({ ...c, followUp: data.date ? { date: data.date, status: data.status ?? "OPEN", ...(data.note ? { note: data.note } : c.followUp?.note ? { note: c.followUp.note } : {}) } : null }));
      return ok ? { ok: true as const } : denied;
    } catch (e) { rethrow(e); }
  });
