import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { canRevealOwnerPhone, canTransitionContactRequest, validateCallPreference, type OwnerContactRequestStatus } from "./owner-contact-requests";

function rethrow(e: unknown): never {
  if (e instanceof Error) throw new Error(e.message);
  throw e;
}
async function me() {
  const { requireUser } = await import("./auth/guards.server");
  return requireUser();
}
async function repo() {
  return import("./db/repositories/owner-contact-requests.server");
}

const cuid = z.string().min(8).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/);

export type MyOwnerContactRequest = {
  id: string;
  type: "PHONE" | "CALL";
  status: OwnerContactRequestStatus;
  property: { slug: string; title: string };
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: string;
  decidedAt: string | null;
  ownerPhone: string | null;
};

export type OwnerContactRequestRow = {
  id: string;
  type: "PHONE" | "CALL";
  status: OwnerContactRequestStatus;
  property: { slug: string; title: string };
  requester: { id: string; name: string };
  preferredDate: string | null;
  preferredTime: string | null;
  createdAt: string;
};

export const requestOwnerPhoneFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ conversationId: cuid }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me();
      return await (await repo()).createOwnerContactRequest({
        requesterId: u.id,
        conversationId: data.conversationId,
        type: "PHONE",
      });
    } catch (e) { rethrow(e); }
  });

export const requestOwnerCallFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ conversationId: cuid, preferredDate: date, preferredTime: time }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me();
      if (!validateCallPreference(data.preferredDate, data.preferredTime)) {
        return { ok: false as const, message: "Choose a future date and time for the call." };
      }
      return await (await repo()).createOwnerContactRequest({
        requesterId: u.id,
        conversationId: data.conversationId,
        type: "CALL",
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
      });
    } catch (e) { rethrow(e); }
  });

export const listMyOwnerContactRequestsFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<MyOwnerContactRequest[]> => {
    try {
      const u = await me();
      return (await (await repo()).listRequesterContactRequests(u.id)).map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        property: r.property,
        preferredDate: r.preferredDate?.toISOString().slice(0, 10) ?? null,
        preferredTime: r.preferredTime,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
        ownerPhone: canRevealOwnerPhone(r.status) ? r.ownerPhone : null,
      }));
    } catch (e) { rethrow(e); }
  });

export const listOwnerContactRequestsFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<OwnerContactRequestRow[]> => {
    try {
      const u = await me();
      return (await (await repo()).listOwnerContactRequests(u.id)).map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        property: r.property,
        requester: r.requester,
        preferredDate: r.preferredDate?.toISOString().slice(0, 10) ?? null,
        preferredTime: r.preferredTime,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (e) { rethrow(e); }
  });

export const respondOwnerContactRequestFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: cuid, status: z.enum(["ACCEPTED", "REJECTED"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await me();
      return await (await repo()).respondOwnerContactRequest(u.id, data.id, data.status);
    } catch (e) { rethrow(e); }
  });

export const ownerContactRequestStatusGuard = canTransitionContactRequest;
