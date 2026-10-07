/**
 * Central role + permission definitions shared by server guards and UI.
 * UI uses these only to show/hide controls; every protected server function
 * re-checks them against the session user loaded from the database.
 */
import { can as canAdmin, type AdminPermission } from "@/lib/admin/permissions";

export const ROLES = ["USER", "OWNER", "AGENT", "PROPERTY_MANAGER", "ADMIN", "SUPER_ADMIN"] as const;
export type AuthRole = (typeof ROLES)[number];
export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "PENDING", "DEACTIVATED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ADMIN_ROLES: AuthRole[] = ["ADMIN", "SUPER_ADMIN"];
export const PRIVILEGED_ROLES: AuthRole[] = ["OWNER", "ADMIN", "SUPER_ADMIN"];

export type AppPermission =
  | "profile.manage" | "saved.manage" | "searches.manage" | "comparisons.manage" | "visits.own" | "enquiries.own"
  | "owner.access" | "listings.own" | "verification.request"
  | "agent.access" | "leads.manage" | "clients.manage" | "followups.manage"
  | "manager.access"
  | AdminPermission;

const USER: AppPermission[] = ["profile.manage", "saved.manage", "searches.manage", "comparisons.manage", "visits.own", "enquiries.own", "owner.access", "listings.own", "verification.request"];
const OWNER: AppPermission[] = [...USER, "owner.access", "listings.own", "verification.request"];
const AGENT: AppPermission[] = [...USER, "agent.access", "listings.own", "leads.manage", "clients.manage", "followups.manage"];
// Property managers: architecture only — no extra product capability exists yet.
const PROPERTY_MANAGER: AppPermission[] = [...USER, "manager.access"];

const base: Record<AuthRole, AppPermission[]> = { USER, OWNER, AGENT, PROPERTY_MANAGER, ADMIN: USER, SUPER_ADMIN: USER };

export function hasPermission(role: AuthRole, permission: AppPermission): boolean {
  if (base[role].includes(permission)) return true;
  return canAdmin(role, permission as AdminPermission);
}

/** Who may assign which role. ADMIN can never grant ADMIN/SUPER_ADMIN; only SUPER_ADMIN can. */
export function canAssignRole(actor: AuthRole, target: AuthRole, subjectCurrent: AuthRole): boolean {
  if (!hasPermission(actor, "users.changeRole")) return false;
  const privileged = PRIVILEGED_ROLES.includes(target) || PRIVILEGED_ROLES.includes(subjectCurrent);
  // The company/platform OWNER is the highest-level account and may manage roles.
  if (actor === "OWNER") return true;
  return privileged ? hasPermission(actor, "users.assignAdmin") : true;
}

/** Route-area access used by route guards (and mirrored server-side). */
export const AREA_ROLES = {
  dashboard: ROLES as readonly AuthRole[],
  owner: ["USER", "OWNER", "ADMIN", "SUPER_ADMIN"] as AuthRole[],
  agent: ["AGENT", "ADMIN", "SUPER_ADMIN"] as AuthRole[],
  admin: ["OWNER", ...ADMIN_ROLES] as AuthRole[],
} as const;
export type Area = keyof typeof AREA_ROLES;

export const roleLabel: Record<AuthRole, string> = {
  USER: "Home seeker", OWNER: "Platform Owner", AGENT: "Agent", PROPERTY_MANAGER: "Property manager", ADMIN: "Admin", SUPER_ADMIN: "Super admin",
};

/** Minimum safe user shape sent to the browser. Never includes tokens or hashes. */
export type SafeUser = {
  id: string; name: string; email: string | null; phone: string | null;
  role: AuthRole; status: AccountStatus; emailVerified: boolean; createdAt: string; updatedAt: string;
};

/** Stable error codes the auth UI maps to friendly messages. */
export const AUTH_ERRORS = {
  SUSPENDED: "ACCOUNT_SUSPENDED",
  DEACTIVATED: "ACCOUNT_DEACTIVATED",
  PENDING: "ACCOUNT_PENDING",
} as const;
