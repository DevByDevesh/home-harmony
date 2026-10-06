/** Server-authorized admin listing operations. UI/demo stores must not be trusted for moderation. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const id = z.string().min(1).max(64);

async function admin() {
  const { requirePermission } = await import("./auth/guards.server");
  return requirePermission("listings.moderate");
}

export const listAdminPropertiesFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { requireDb } = await import("./db/client.server");
  const db = await requireDb();
  const rows = await db.property.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true, slug: true, title: true, locality: true, city: true, price: true,
      listingType: true, status: true, verificationStatus: true, changesRequested: true,
      ownerId: true, agentId: true, updatedAt: true,
      _count: { select: { reports: true, featured: true } },
    },
  });
  return rows.map((p) => ({
    ...p,
    mode: p.listingType === "RENT" ? "Rent" as const : "Buy" as const,
    verification: p.verificationStatus,
    reports: p._count.reports,
    featured: p._count.featured > 0,
    updatedAt: p.updatedAt.toISOString(),
  }));
});

const actionSchema = z.object({
  propertyId: id,
  action: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT", "PAUSE", "RESUME", "ARCHIVE", "RESTORE"]),
  note: z.string().trim().max(500).optional(),
}).strict();

export const moderateListingFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => actionSchema.parse(d))
  .handler(async ({ data }) => {
    const actor = await admin();
    const { requireDb } = await import("./db/client.server");
    const db = await requireDb();

    const current = await db.property.findUnique({
      where: { id: data.propertyId },
      select: { id: true, status: true, title: true },
    });
    if (!current) return { ok: false as const, message: "Listing not found." };

    const next = {
      APPROVE: "ACTIVE",
      REQUEST_CHANGES: "UNDER_REVIEW",
      REJECT: "ARCHIVED",
      PAUSE: "PAUSED",
      RESUME: "ACTIVE",
      ARCHIVE: "ARCHIVED",
      RESTORE: "UNDER_REVIEW",
    }[data.action] as "ACTIVE" | "UNDER_REVIEW" | "PAUSED" | "ARCHIVED";

    if (data.action === "APPROVE" && current.status !== "UNDER_REVIEW") {
      return { ok: false as const, message: "Only listings under review can be approved." };
    }
    if (data.action === "REQUEST_CHANGES" && current.status !== "UNDER_REVIEW") {
      return { ok: false as const, message: "Only listings under review can receive change requests." };
    }
    if (data.action === "RESUME" && current.status !== "PAUSED") {
      return { ok: false as const, message: "Only paused listings can be resumed." };
    }
    if (data.action === "PAUSE" && current.status !== "ACTIVE") {
      return { ok: false as const, message: "Only active listings can be paused." };
    }

    const changesRequested = data.action === "REQUEST_CHANGES"
      ? (data.note || "Please review and update the listing details before resubmitting.")
      : data.action === "APPROVE" || data.action === "RESTORE"
        ? null
        : undefined;

    await db.$transaction([
      db.property.update({
        where: { id: data.propertyId },
        data: {
          status: next,
          ...(data.action === "APPROVE" ? { publishedAt: new Date() } : {}),
          ...(changesRequested !== undefined ? { changesRequested } : {}),
        },
      }),
      db.auditLog.create({
        data: {
          actorId: actor.id,
          action: `Listing moderation: ${data.action}`,
          entityType: "Property",
          entityId: data.propertyId,
          result: "SUCCESS",
          metadata: data.note ? { note: data.note } : undefined,
        },
      }),
    ]);

    return { ok: true as const, status: next };
  });
