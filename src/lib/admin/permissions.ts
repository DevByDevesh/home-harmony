export type Role = "USER" | "OWNER" | "AGENT" | "PROPERTY_MANAGER" | "ADMIN";
export type AdminPermission =
  | "admin.access" | "users.manage" | "users.changeRole" | "users.assignAdmin" | "listings.moderate" | "verification.review"
  | "reports.moderate" | "enquiries.manage" | "visits.manage" | "payments.view" | "payments.refund"
  | "plans.edit" | "subscriptions.manage" | "services.manage" | "analytics.view" | "settings.view" | "settings.edit" | "audit.view" | "support.manage";

const ADMIN: AdminPermission[] = ["admin.access","users.manage","users.changeRole","listings.moderate","verification.review","reports.moderate","enquiries.manage","visits.manage","payments.view","subscriptions.manage","services.manage","analytics.view","settings.view","audit.view","support.manage"];
const matrix: Partial<Record<Role, AdminPermission[]>> = {
  OWNER: [...ADMIN,"users.assignAdmin","payments.refund","plans.edit","settings.edit"],
  ADMIN,
};
export function can(role: Role, permission: AdminPermission) { return matrix[role]?.includes(permission) ?? false; }
export const isAdminRole = (role: Role) => can(role,"admin.access");
export function assignableRoles(actor: Role): Role[] {
  const base: Role[] = ["USER","OWNER","AGENT","PROPERTY_MANAGER"];
  return can(actor,"users.assignAdmin") ? [...base,"ADMIN"] : base;
}
export const GRANULAR_ADMIN_PERMISSIONS: AdminPermission[] = ["listings.moderate","users.manage","users.changeRole","verification.review","reports.moderate","enquiries.manage","visits.manage","payments.view","subscriptions.manage","services.manage","analytics.view","settings.view","audit.view","support.manage"];
export const ADMIN_PERMISSION_LABELS: Record<AdminPermission,string> = {
  "admin.access":"Admin Dashboard","users.manage":"User Management","users.changeRole":"User Role Changes","users.assignAdmin":"Admin Management","listings.moderate":"Listings Management","verification.review":"Verification Review",
  "reports.moderate":"Reports","enquiries.manage":"Enquiries","visits.manage":"Visits","payments.view":"Payments View","payments.refund":"Payment Refunds","plans.edit":"Plans","subscriptions.manage":"Subscriptions","services.manage":"Services",
  "analytics.view":"Analytics","settings.view":"Settings View","settings.edit":"Settings Edit","audit.view":"Audit Activity","support.manage":"Customer Support",
};
export function defaultGranularAdminPermissions(): AdminPermission[] { return [...GRANULAR_ADMIN_PERMISSIONS]; }
export function normaliseGranularAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return defaultGranularAdminPermissions();
  const allowed = new Set(GRANULAR_ADMIN_PERMISSIONS);
  return value.filter((p): p is AdminPermission => typeof p === "string" && allowed.has(p as AdminPermission));
}
