/**
 * Centralised admin permissions. UI calls `can()` only; never compare roles inline.
 * TODO(server-auth): these checks are UX only. A real backend must re-check every
 * permission server-side against a user_roles table before mutating anything.
 */
import type { Role } from "@/lib/roles";

export type AdminPermission =
  | "admin.access" | "users.manage" | "users.changeRole" | "users.assignAdmin" | "listings.moderate" | "verification.review"
  | "reports.moderate" | "enquiries.manage" | "visits.manage" | "payments.view" | "payments.refund"
  | "plans.edit" | "subscriptions.manage" | "services.manage" | "analytics.view" | "settings.view" | "settings.edit" | "audit.view";

const ADMIN: AdminPermission[] = [
  "admin.access", "users.manage", "users.changeRole", "listings.moderate", "verification.review", "reports.moderate",
  "enquiries.manage", "visits.manage", "payments.view", "subscriptions.manage", "services.manage", "analytics.view", "settings.view", "audit.view",
];
const matrix: Partial<Record<Role, AdminPermission[]>> = {
  // OWNER is the company/platform holder: full administrative access plus
  // the ability to assign privileged roles. SUPER_ADMIN remains the operational admin role.
  OWNER: [...ADMIN, "users.assignAdmin", "payments.refund", "plans.edit", "settings.edit"],
  ADMIN,
  SUPER_ADMIN: [...ADMIN, "users.assignAdmin", "payments.refund", "plans.edit", "settings.edit"],
};

export function can(role: Role, permission: AdminPermission) { return matrix[role]?.includes(permission) ?? false; }
export const isAdminRole = (role: Role) => can(role, "admin.access");
/** Roles an actor may assign. OWNER is the platform holder; ADMIN cannot create other admins. */
export function assignableRoles(actor: Role): Role[] {
  const base: Role[] = ["USER", "OWNER", "AGENT", "PROPERTY_MANAGER"];
  return can(actor, "users.assignAdmin") ? [...base, "ADMIN", "SUPER_ADMIN"] : base;
}
