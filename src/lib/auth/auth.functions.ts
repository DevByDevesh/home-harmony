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

export const listAdminPermissions = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ userId: z.string().min(1) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { requirePermission, AuthError } = await guards();
      const actor = await requirePermission("users.assignAdmin");
      if (actor.role !== "OWNER") throw new AuthError(403, "Only the platform Owner can manage Admin permissions.");
      const { requireDb } = await import("@/lib/db/client.server");
      const { normaliseGranularAdminPermissions } = await import("../admin/permissions");
      const db = await requireDb();
      const subject = await db.user.findUnique({ where: { id: data.userId }, select: { role: true, adminPermissions: true } });
      if (!subject || subject.role !== "ADMIN") throw new AuthError(403, "Only Admin accounts have granular permissions.");
      return { permissions: normaliseGranularAdminPermissions(subject.adminPermissions) };
    } catch (e) { rethrow(e); }
  });

export const setAdminPermissions = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().min(1), permissions: z.array(z.string()).max(50) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { requirePermission, AuthError } = await guards();
      const actor = await requirePermission("users.assignAdmin");
      if (actor.role !== "OWNER") throw new AuthError(403, "Only the platform Owner can manage Admin permissions.");
      const { requireDb } = await import("@/lib/db/client.server");
      const { GRANULAR_ADMIN_PERMISSIONS, normaliseGranularAdminPermissions } = await import("../admin/permissions");
      const { writeAudit } = await import("./audit.server");
      const db = await requireDb();
      const permissions = normaliseGranularAdminPermissions(data.permissions);
      if (permissions.length !== new Set(data.permissions).size || data.permissions.some(p => !GRANULAR_ADMIN_PERMISSIONS.includes(p as typeof GRANULAR_ADMIN_PERMISSIONS[number]))) {
        throw new AuthError(403, "One or more selected permissions are not assignable to Admin accounts.");
      }
      const subject = await db.user.findUnique({ where: { id: data.userId }, select: { id: true, role: true, adminPermissions: true } });
      if (!subject || subject.role !== "ADMIN") throw new AuthError(403, "Only Admin accounts have granular permissions.");
      await db.user.update({ where: { id: subject.id }, data: { adminPermissions: permissions } });
      await writeAudit({ actorId: actor.id, action: "admin.permissions.update", entityType: "User", entityId: subject.id, metadata: { permissions: permissions.join(",") } });
      return { ok: true as const, permissions };
    } catch (e) { rethrow(e); }
  });

export const listAccounts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requirePermission } = await guards();
    await requirePermission("users.manage");
    const { requireDb } = await import("@/lib/db/client.server");
    const db = await requireDb();
    const rows = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    });
    return rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }));
  } catch (e) { rethrow(e); }
});

export const changeUserRole = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().min(1), role: z.enum(ROLES), adminConfirmation: z.boolean().optional().default(false) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requirePermission, AuthError } = await guards();
      const { canAssignRole } = await import("./roles");
      const { writeAudit } = await import("./audit.server");
      const actor = await requirePermission("users.changeRole");
      const { requireDb } = await import("@/lib/db/client.server");
      const db = await requireDb();
      const subject = await db.user.findUnique({
        where: { id: data.userId },
        select: { id: true, role: true, status: true },
      });
      if (!subject) throw new AuthError(403, "Account not found.");
      if (subject.id === actor.id || !canAssignRole(actor.role, data.role, subject.role)) {
        await writeAudit({ actorId: actor.id, action: "role.change", entityType: "User", entityId: subject.id, result: "DENIED", metadata: { from: subject.role, to: data.role, self: subject.id === actor.id } });
        throw new AuthError(403, subject.id === actor.id ? "You can't change your own role." : "Only the platform Owner can grant or remove Admin roles.");
      }
      if (data.role === "ADMIN" && subject.role === "USER" && subject.status !== "ACTIVE") {
        await writeAudit({ actorId: actor.id, action: "role.assign_admin", entityType: "User", entityId: subject.id, result: "DENIED", metadata: { reason: "ADMIN_ACCOUNT_NOT_ACTIVE", status: subject.status } });
        throw new AuthError(403, "Only active accounts can be appointed Admin.");
      }
      await db.user.update({ where: { id: subject.id }, data: { role: data.role } });
      const privileged = data.role === "ADMIN";
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
      const privilegedSubject = subject.role === "OWNER" || subject.role === "ADMIN";
      if (subject.id === actor.id || (privilegedSubject && !hasPermission(actor.role, "users.assignAdmin"))) {
        await writeAudit({ actorId: actor.id, action: "account.status", entityType: "User", entityId: subject.id, result: "DENIED", metadata: { to: data.status } });
        throw new AuthError(403, subject.id === actor.id ? "You can't change your own account status." : "Only the platform Owner can change a privileged account's status.");
      }
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: subject.id }, data: { status: data.status } });

        // A banned/suspended account must lose access to every listing it owns
        // or manages. Never auto-reactivate these listings when the account is restored;
        // an admin must explicitly approve/resume them again.
        if (data.status === "SUSPENDED") {
          await tx.property.updateMany({
            where: {
              OR: [{ ownerId: subject.id }, { agentId: subject.id }],
              status: { in: ["ACTIVE", "PAUSED", "UNDER_REVIEW"] },
            },
            data: { status: "SUSPENDED" },
          });
        }

        // Invalidate live sessions whenever access is removed.
        if (data.status !== "ACTIVE") {
          await tx.session.deleteMany({ where: { userId: subject.id } });
        }
      });
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
