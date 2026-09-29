/** Security audit writer. Never pass passwords, hashes, tokens or connection strings in metadata. */
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db/client.server";

export async function writeAudit(e: { actorId: string | null; action: string; entityType: string; entityId?: string | null; result?: "SUCCESS" | "DENIED"; metadata?: Prisma.InputJsonValue | undefined }) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.auditLog.create({ data: { actorId: e.actorId, action: e.action, entityType: e.entityType, entityId: e.entityId ?? null, result: e.result ?? "SUCCESS", ...(e.metadata !== undefined ? { metadata: e.metadata } : {}) } });
  } catch (err) {
    console.error("audit write failed", err instanceof Error ? err.message : "unknown");
  }
}
