import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeOwnerContact, type OwnerContactPreference } from "./owner-contact.validation";

export type OwnerContactProfile = {
  displayName: string;
  phone: string | null;
  preferredContact: OwnerContactPreference | null;
};

function rethrow(e: unknown): never {
  if (e instanceof Error) throw new Error(e.message);
  throw e;
}

const contactSchema = z.object({
  phone: z.string().trim().max(32),
  preferredContact: z.enum(["CALL", "WHATSAPP", "BOTH"]).nullable(),
}).strict();

export const getMyOwnerContactFn = createServerFn({ method: "GET" }).handler(async (): Promise<OwnerContactProfile> => {
  try {
    const { requireRole } = await import("./auth/guards.server");
    const { LISTING_ROLES } = await import("./auth/roles");
    const { requireDb } = await import("./db/client.server");
    const me = await requireRole(LISTING_ROLES, "owner.profile.read");
    const db = await requireDb();
    const profile = await db.ownerProfile.findUnique({
      where: { userId: me.id },
      select: { displayName: true, contactPhone: true, preferredContact: true },
    });
    return {
      displayName: profile?.displayName || me.name || me.email || "HouseProvider owner",
      phone: profile?.contactPhone ?? null,
      preferredContact: (profile?.preferredContact as OwnerContactPreference | null) ?? null,
    };
  } catch (e) {
    rethrow(e);
  }
});

export const updateMyOwnerContactFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => contactSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireRole } = await import("./auth/guards.server");
      const { AREA_ROLES } = await import("./auth/roles");
      const { requireDb } = await import("./db/client.server");
      const { writeAudit } = await import("./auth/audit.server");
      const me = await requireRole(LISTING_ROLES, "owner.profile.update");
      const contact = normalizeOwnerContact(data);
      const db = await requireDb();
      const existing = await db.ownerProfile.findUnique({ where: { userId: me.id }, select: { id: true } });
      const profile = existing
        ? await db.ownerProfile.update({
            where: { userId: me.id },
            data: { contactPhone: contact.phone, preferredContact: contact.preferredContact },
            select: { displayName: true, contactPhone: true, preferredContact: true },
          })
        : await db.ownerProfile.create({
            data: {
              userId: me.id,
              displayName: me.name || me.email || "HouseProvider owner",
              contactPhone: contact.phone,
              preferredContact: contact.preferredContact,
            },
            select: { displayName: true, contactPhone: true, preferredContact: true },
          });
      await writeAudit({
        actorId: me.id,
        action: "owner.profile.contact.update",
        entityType: "OwnerProfile",
        entityId: existing?.id ?? me.id,
        metadata: { hasPhone: !!contact.phone, preferredContact: contact.preferredContact },
      });
      return {
        ok: true as const,
        profile: {
          displayName: profile.displayName,
          phone: profile.contactPhone,
          preferredContact: profile.preferredContact as OwnerContactPreference | null,
        },
      };
    } catch (e) {
      rethrow(e);
    }
  });
