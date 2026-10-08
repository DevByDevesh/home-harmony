import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const categories = ["ACCOUNT", "LISTING", "PAYMENT", "ABUSE", "TECHNICAL", "OTHER"] as const;
const statuses = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"] as const;
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const attachmentSchema = z.object({
  name: z.string().min(1).max(160),
  type: z.string().max(120),
  size: z.number().int().nonnegative().max(1_500_000),
  dataUrl: z.string().startsWith("data:").max(2_100_000),
}).strict();

async function db() { const { requireDb } = await import("./db/client.server"); return requireDb(); }
async function guard(permission: "profile.manage" | "support.manage") { const { requirePermission } = await import("./auth/guards.server"); return requirePermission(permission); }
function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }

export type SupportTicket = {
  id: string; category: string; subject: string; description: string; priority: string; status: string;
  attachments: Array<{ name: string; type: string; size: number; dataUrl: string }>; createdAt: string; updatedAt: string;
};

function mapTicket(t: { id: string; category: string; subject: string; description: string; priority: string; status: string; attachments: unknown; createdAt: Date; updatedAt: Date }): SupportTicket {
  return { id: t.id, category: t.category, subject: t.subject, description: t.description, priority: t.priority, status: t.status, attachments: Array.isArray(t.attachments) ? t.attachments as SupportTicket["attachments"] : [], createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() };
}

export const createSupportTicketFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    category: z.enum(categories), subject: z.string().trim().min(3).max(160), description: z.string().trim().min(10).max(10_000),
    priority: z.enum(priorities).default("MEDIUM"), attachments: z.array(attachmentSchema).max(3).default([]),
  }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const user = await guard("profile.manage");
      const ticket = await (await db()).supportTicket.create({
        data: { userId: user.id, category: data.category, subject: data.subject, description: data.description, priority: data.priority, attachments: data.attachments },
      });
      return mapTicket(ticket);
    } catch (e) { rethrow(e); }
  });

export const listMySupportTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const user = await guard("profile.manage");
    const rows = await (await db()).supportTicket.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(mapTicket);
  } catch (e) { rethrow(e); }
});

export const listSupportTicketsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await guard("support.manage");
    const rows = await (await db()).supportTicket.findMany({
      orderBy: { createdAt: "desc" }, take: 300,
      include: { user: { select: { id: true, name: true, email: true } }, assignee: { select: { id: true, name: true } } },
    });
    return rows.map(mapTicket);
  } catch (e) { rethrow(e); }
});

export const updateSupportTicketFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().min(1), status: z.enum(statuses).optional(), priority: z.enum(priorities).optional(),
  }).strict().refine(v => v.status || v.priority, "A ticket change is required.").parse(d))
  .handler(async ({ data }) => {
    try {
      const actor = await guard("support.manage");
      const database = await db();
      const current = await database.supportTicket.findUnique({
        where: { id: data.id },
        select: { id: true, userId: true, subject: true, status: true, priority: true },
      });
      if (!current) throw new Error("Support ticket not found.");

      const ticket = await database.$transaction(async (tx) => {
        const updated = await tx.supportTicket.update({
          where: { id: data.id },
          data: { ...(data.status ? { status: data.status, resolvedAt: ["RESOLVED", "CLOSED"].includes(data.status) ? new Date() : null } : {}), ...(data.priority ? { priority: data.priority } : {}), assigneeId: actor.id },
        });

        const changedStatus = data.status && data.status !== current.status;
        const changedPriority = data.priority && data.priority !== current.priority;
        if (changedStatus || changedPriority) {
          const statusText = changedStatus ? `Status: ${data.status!.replaceAll("_", " ")}` : "";
          const priorityText = changedPriority ? `Priority: ${data.priority}` : "";
          const details = [statusText, priorityText].filter(Boolean).join(" · ");
          await tx.notification.create({
            data: {
              userId: current.userId,
              type: "SUPPORT_TICKET_UPDATED",
              title: "Support ticket updated",
              message: `${current.subject} · ${details}`,
              metadata: { ticketId: current.id },
            },
          });
        }

        return updated;
      });

      return mapTicket(ticket);
    } catch (e) { rethrow(e); }
  });
