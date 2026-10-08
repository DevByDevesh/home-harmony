/**
 * Server-only agent CRM on the existing Enquiry model. A lead = an enquiry whose handler is the agent.
 * Pipeline stage, notes and follow-up live in Enquiry.notes.crm (JSON, no schema change);
 * Enquiry.status is kept in step so admin views stay meaningful.
 */
import type { Prisma } from "@prisma/client";
import { requireDb } from "../client.server";

export const STAGES = ["NEW", "CONTACTED", "INTERESTED", "VISIT_SCHEDULED", "NEGOTIATION", "CONVERTED", "LOST"] as const;
export type Stage = (typeof STAGES)[number];
export type Crm = { stage: Stage; lastContact: string | null; followUp: { date: string; status: "OPEN" | "DONE"; note?: string } | null; notes: { id: string; text: string; at: string }[] };

const statusFor: Record<Stage, "NEW" | "CONTACTED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"> = { NEW: "NEW", CONTACTED: "CONTACTED", INTERESTED: "IN_PROGRESS", VISIT_SCHEDULED: "IN_PROGRESS", NEGOTIATION: "IN_PROGRESS", CONVERTED: "RESOLVED", LOST: "CLOSED" };

export function readCrm(notes: unknown): Crm {
  const c = (notes && typeof notes === "object" ? (notes as { crm?: Partial<Crm> }).crm : undefined) ?? {};
  return { stage: STAGES.includes(c.stage as Stage) ? (c.stage as Stage) : "NEW", lastContact: c.lastContact ?? null, followUp: c.followUp ?? null, notes: Array.isArray(c.notes) ? c.notes : [] };
}

export async function listAgentLeads(agentId: string) {
  const db = await requireDb();
  return db.enquiry.findMany({
    where: { handlerId: agentId }, orderBy: { createdAt: "desc" }, take: 300,
    select: { id: true, notes: true, createdAt: true, user: { select: { name: true } }, property: { select: { slug: true, title: true, locality: true, city: true } } },
  });
}

/** Applies a change to one of the agent's own leads. Returns false when the lead isn't assigned to them. */
export async function updateAgentLead(agentId: string, id: string, fn: (c: Crm) => Crm) {
  const db = await requireDb();
  return db.$transaction(async (tx) => {
    const e = await tx.enquiry.findFirst({ where: { id, handlerId: agentId }, select: { notes: true } });
    if (!e) return false;
    const next = fn(readCrm(e.notes));
    const base = e.notes && typeof e.notes === "object" && !Array.isArray(e.notes) ? (e.notes as Record<string, unknown>) : {};
    await tx.enquiry.update({ where: { id }, data: { notes: { ...base, crm: next } as Prisma.InputJsonValue, status: statusFor[next.stage], lastActivityAt: new Date() } });
    return true;
  });
}
