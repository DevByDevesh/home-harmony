/** Append-only audit repository: exposes create and read only, never update/delete. */
import type { Prisma } from "@prisma/client";
import { requireDb } from "../client.server";

export async function recordAudit(entry: { actorId?: string; action: string; entityType: string; entityId?: string; result?: "SUCCESS" | "DENIED"; metadata?: Prisma.InputJsonValue }) {
  const db = await requireDb();
  return db.auditLog.create({ data: { actorId: entry.actorId ?? null, action: entry.action, entityType: entry.entityType, entityId: entry.entityId ?? null, result: entry.result ?? "SUCCESS", ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}) } });
}

export async function listAudit(take = 50) {
  const db = await requireDb();
  return db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(take, 200) });
}
