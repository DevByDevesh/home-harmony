/**
 * Server-side authorization. Identity always comes from the session cookie → DB,
 * never from client payloads, localStorage or the demo view switcher.
 */
import { getRequestHeaders } from "@tanstack/react-start/server";
import { requireDb } from "@/lib/db/client.server";
import { getAuth } from "./auth.server";
import { writeAudit } from "./audit.server";
import { hasPermission, type AppPermission, type AuthRole, type SafeUser } from "./roles";
import { normaliseGranularAdminPermissions } from "../admin/permissions";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) { super(message); }
}

export async function getSessionUser(): Promise<SafeUser | null> {
  const auth = await getAuth();
  // Do not turn database/auth transport failures into "signed out".
  // A transient DB pool error must surface as an error, otherwise the UI
  // incorrectly redirects an already-authenticated user to /login.
  const session = await auth.api.getSession({ headers: getRequestHeaders() as unknown as Headers });
  if (!session) return null;
  const db = await requireDb();
  const u = await db.user.findUnique({ where: { id: session.user.id } });
  if (!u) return null;
  // Suspended/deactivated/pending accounts lose access immediately, even with a live cookie.
  if (u.status !== "ACTIVE") return null;
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role as AuthRole, status: u.status, emailVerified: u.emailConfirmed, createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString() };
}

export async function requireUser(): Promise<SafeUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError(401, "Sign in required.");
  return u;
}

export async function requireRole(roles: readonly AuthRole[], action = "access"): Promise<SafeUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) {
    await writeAudit({ actorId: u.id, action: "auth.unauthorized", entityType: "Route", entityId: action, result: "DENIED", metadata: { role: u.role } });
    throw new AuthError(403, "You don't have access to this.");
  }
  return u;
}

export async function requirePermission(permission: AppPermission): Promise<SafeUser> {
  const u = await requireUser();
  let allowed = hasPermission(u.role, permission);
  if (allowed && (u.role === "ADMIN" || u.role === "SUPER_ADMIN")) {
    const db = await requireDb();
    const record = await db.user.findUnique({ where: { id: u.id }, select: { adminPermissions: true } });
    const granular = normaliseGranularAdminPermissions(record?.adminPermissions);
    if (permission !== "admin.access" && permission !== "users.assignAdmin" && permission !== "payments.refund" && permission !== "plans.edit" && permission !== "settings.edit") {
      allowed = granular.includes(permission as import("../admin/permissions").AdminPermission);
    }
  }
  if (!allowed) {
    await writeAudit({ actorId: u.id, action: "auth.unauthorized", entityType: "Permission", entityId: permission, result: "DENIED", metadata: { role: u.role } });
    throw new AuthError(403, "You don't have permission for this action.");
  }
  return u;
}
