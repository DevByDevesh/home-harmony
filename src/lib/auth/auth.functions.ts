/**
 * Auth server functions. Server-only modules are imported inside handlers so
 * nothing privileged reaches the browser bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ROLES, ACCOUNT_STATUSES, type SafeUser } from "./roles";

async function guards() { return import("./guards.server"); }

function rethrow(e: unknown): never {
  if (e && typeof e === "object" && "status" in e && e instanceof Error) throw new Error(e.message);
  throw e;
}

/** Current signed-in user (safe fields only) or null. Public: never throws for signed-out visitors. */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(async (): Promise<SafeUser | null> => {
  return await (await guards()).getSessionUser();
});

export const listAccounts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requirePermission } = await guards();
    await requirePermission("users.manage");
    const { requireDb } = await import("@/lib/db/client.server");
    const db = await requireDb();
    const rows = await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } });
    return rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } catch (e) { rethrow(e); }
});

export const changeUserRole = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().min(1), role: z.enum(ROLES) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requirePermission, AuthError } = await guards();
      const { canAssignRole } = await import("./roles");
      const { writeAudit } = await import("./audit.server");
      const actor = await requirePermission("users.changeRole");
      const { requireDb } = await import("@/lib/db/client.server");
      const db = await requireDb();
      const subject = await db.user.findUnique({ where: { id: data.userId }, select: { id: true, role: true } });
      if (!subject) throw new AuthError(403, "Account not found.");
      if (subject.id === actor.id || !canAssignRole(actor.role, data.role, subject.role)) {
        await writeAudit({ actorId: actor.id, action: "role.change", entityType: "User", entityId: subject.id, result: "DENIED", metadata: { from: subject.role, to: data.role, self: subject.id === actor.id } });
        throw new AuthError(403, subject.id === actor.id ? "You can't change your own role." : "Only a Super admin can grant or remove admin roles.");
      }
      await db.user.update({ where: { id: subject.id }, data: { role: data.role } });
      const privileged = data.role === "ADMIN" || data.role === "SUPER_ADMIN";
      await writeAudit({ actorId: actor.id, action: privileged ? "role.assign_admin" : "role.change", entityType: "User", entityId: subject.id, metadata: { from: subject.role, to: data.role } });
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

export const setAccountStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().min(1), status: z.enum(ACCOUNT_STATUSES) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requirePermission, AuthError } = await guards();
      const { hasPermission } = await import("./roles");
      const { writeAudit } = await import("./audit.server");
      const actor = await requirePermission("users.manage");
      const { requireDb } = await import("@/lib/db/client.server");
      const db = await requireDb();
      const subject = await db.user.findUnique({ where: { id: data.userId }, select: { id: true, role: true, status: true } });
      if (!subject) throw new AuthError(403, "Account not found.");
      const privilegedSubject = subject.role === "ADMIN" || subject.role === "SUPER_ADMIN";
      if (subject.id === actor.id || (privilegedSubject && !hasPermission(actor.role, "users.assignAdmin"))) {
        await writeAudit({ actorId: actor.id, action: "account.status", entityType: "User", entityId: subject.id, result: "DENIED", metadata: { to: data.status } });
        throw new AuthError(403, subject.id === actor.id ? "You can't change your own account status." : "Only a Super admin can change an admin's status.");
      }
      await db.user.update({ where: { id: subject.id }, data: { status: data.status } });
      // Invalidate live sessions whenever access is removed.
      if (data.status !== "ACTIVE") await db.session.deleteMany({ where: { userId: subject.id } });
      const action = data.status === "SUSPENDED" ? "account.suspend" : data.status === "DEACTIVATED" ? "account.deactivate" : data.status === "ACTIVE" ? "account.restore" : "account.pending";
      await writeAudit({ actorId: actor.id, action, entityType: "User", entityId: subject.id, metadata: { from: subject.status, to: data.status } });
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });

/** Protected workspace probes — prove each area is enforced on the server, not just hidden in the UI. */
export const getOwnerWorkspace = createServerFn({ method: "GET" }).handler(async () => {
  try { const u = await (await guards()).requirePermission("owner.access"); return { area: "owner" as const, userId: u.id }; } catch (e) { rethrow(e); }
});
export const getAgentWorkspace = createServerFn({ method: "GET" }).handler(async () => {
  try { const u = await (await guards()).requirePermission("agent.access"); return { area: "agent" as const, userId: u.id }; } catch (e) { rethrow(e); }
});
export const getAdminWorkspace = createServerFn({ method: "GET" }).handler(async () => {
  try { const u = await (await guards()).requirePermission("admin.access"); return { area: "admin" as const, userId: u.id }; } catch (e) { rethrow(e); }
});
