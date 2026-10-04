/**
 * Visits (owner side), enquiries, notifications and recently viewed â€” PostgreSQL-backed.
 * Identity always comes from the session; listing ownership is checked in every query.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { VisitStatus } from "./visits";

function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }
async function me() { const { requireUser } = await import("./auth/guards.server"); return requireUser(); }
async function maybeMe() { const { getSessionUser } = await import("./auth/guards.server"); return getSessionUser(); }
async function repo() { return import("./db/repositories/engagement.server"); }
const cuid = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const slug = z.string().min(1).max(120);

export type OwnerVisit = { id: string; slug: string; title: string; visitor: string; date: string; slot: string; note: string | null; status: VisitStatus; createdAt: string };
export type EnquiryRow = { id: string; slug: string; title: string; message: string; status: string; createdAt: string; from?: string };
export type NotificationRow = { id: string; type: string; title: string; message: string; read: boolean; createdAt: string };

export const createVisitFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug,
    date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
    time: z.string().regex(/^\\d{2}:\\d{2}$/),
    note: z.string().trim().max(240).optional(),
  }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me();
      return await (await repo()).createVisit(u.id, data.slug, data.date, data.time, data.note);
    } catch (e) { rethrow(e); }
  });

export const listOwnerVisitsFn = createServerFn({ method: "GET" }).handler(async (): Promise<OwnerVisit[]> => {
  try {
    const u = await me();
    return (await (await repo()).listOwnerVisits(u.id)).map((v) => ({ id: v.id, slug: v.property.slug, title: v.property.title, visitor: v.user.name.split(" ")[0] || "Visitor", date: v.requestedDate.toISOString().slice(0, 10), slot: v.requestedTime, note: v.notes, status: v.status, createdAt: v.createdAt.toISOString() }));
  } catch (e) { rethrow(e); }
});

export const ownerUpdateVisitFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: cuid, status: z.enum(["CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), slot: z.string().regex(/^\d{2}:\d{2}$/).optional() }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me();
      const err = await (await repo()).ownerUpdateVisit(u.id, data.id, data.status, data.date, data.slot);
      return err ? { ok: false as const, message: err } : { ok: true as const };
    } catch (e) { rethrow(e); }
  });

export const createEnquiryFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug, message: z.string().trim().min(5).max(1000) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me();
      const r = await (await repo()).createEnquiry(u.id, data.slug, data.message);
      if (!r) return { ok: false as const, message: "This home isnâ€™t accepting enquiries." };
      if (r === "own") return { ok: false as const, message: "This is your own listing." };
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

const toEnquiry = (e: { id: string; message: string; status: string; createdAt: Date; property: { slug: string; title: string }; user?: { name: string } }): EnquiryRow =>
  ({ id: e.id, slug: e.property.slug, title: e.property.title, message: e.message, status: e.status, createdAt: e.createdAt.toISOString(), ...(e.user ? { from: e.user.name.split(" ")[0] || "Visitor" } : {}) });

export const listMyEnquiriesFn = createServerFn({ method: "GET" }).handler(async (): Promise<EnquiryRow[] | null> => {
  try { const u = await maybeMe(); if (!u) return null; return (await (await repo()).listMyEnquiries(u.id)).map(toEnquiry); } catch (e) { rethrow(e); }
});
export const listOwnerEnquiriesFn = createServerFn({ method: "GET" }).handler(async (): Promise<EnquiryRow[]> => {
  try { const u = await me(); return (await (await repo()).listOwnerEnquiries(u.id)).map(toEnquiry); } catch (e) { rethrow(e); }
});

export const listMyNotificationsFn = createServerFn({ method: "GET" }).handler(async (): Promise<NotificationRow[] | null> => {
  try {
    const u = await maybeMe(); if (!u) return null;
    return (await (await repo()).listMyNotifications(u.id)).map((n) => ({ id: n.id, type: n.type, title: n.title, message: n.message, read: !!n.readAt, createdAt: n.createdAt.toISOString() }));
  } catch (e) { rethrow(e); }
});

export const setRecentFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slugs: z.array(slug).max(12) }).strict().parse(d))
  .handler(async ({ data }) => {
    try { const u = await me(); await (await repo()).setRecent(u.id, [...new Set(data.slugs)]); return { ok: true as const }; } catch (e) { rethrow(e); }
  });
export type ConversationRow = {
  id: string
  property: { slug: string; title: string; city: string; locality: string }
  buyer: { id: string; name: string }
  participant: { id: string; name: string }
  lastMessageAt: string | null
  lastMessage: { body: string; createdAt: string; senderId: string; readAt: string | null } | null
}

export type MessageRow = {
  id: string
  senderId: string
  body: string
  readAt: string | null
  createdAt: string
}

export const startConversationFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slug,
    message: z.string().trim().min(1).max(2000),
  }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me()
      return await (await repo()).getOrCreateConversation(u.id, data.slug, data.message)
    } catch (e) { rethrow(e) }
  })

export const listConversationsFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<ConversationRow[]> => {
    try {
      const u = await me()
      return (await (await repo()).listConversations(u.id)).map((c) => ({
        id: c.id,
        property: c.property,
        buyer: c.buyer,
        participant: c.participant,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        lastMessage: c.messages[0] ? {
          body: c.messages[0].body,
          createdAt: c.messages[0].createdAt.toISOString(),
          senderId: c.messages[0].senderId,
          readAt: c.messages[0].readAt?.toISOString() ?? null,
        } : null,
      }))
    } catch (e) { rethrow(e) }
  })

export const getConversationFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ conversationId: cuid }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me()
      const c = await (await repo()).getConversation(u.id, data.conversationId)
      if (!c) return null
      return {
        ...c,
        messages: c.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          readAt: m.readAt?.toISOString() ?? null,
        })),
      }
    } catch (e) { rethrow(e) }
  })

export const sendMessageFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    conversationId: cuid,
    body: z.string().trim().min(1).max(2000),
  }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me()
      const result = await (await repo()).sendMessage(u.id, data.conversationId, data.body)
      if (!result.ok) return result
      return {
        ok: true as const,
        message: {
          ...result.message,
          createdAt: result.message.createdAt.toISOString(),
          readAt: result.message.readAt?.toISOString() ?? null,
        },
      }
    } catch (e) { rethrow(e) }
  })

export const markConversationReadFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ conversationId: cuid }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me()
      return await (await repo()).markConversationRead(u.id, data.conversationId)
    } catch (e) { rethrow(e) }
  })
