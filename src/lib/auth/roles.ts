/**
 * Central role + permission definitions shared by server guards and UI.
 * OWNER is the sole platform authority; ADMIN is the operational moderation role.
 */
import { can as canAdmin, type AdminPermission } from "../admin/permissions.ts";

export const ROLES = ["USER", "OWNER", "AGENT", "PROPERTY_MANAGER", "ADMIN"] as const;
export type AuthRole = (typeof ROLES)[number];
export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "PENDING", "DEACTIVATED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ADMIN_ROLES: AuthRole[] = ["ADMIN"];
export const PRIVILEGED_ROLES: AuthRole[] = ["OWNER", "ADMIN"];
/** Accounts allowed to create and manage their own property listings. */
export const LISTING_ROLES: AuthRole[] = ["USER", "OWNER"];

export type AppPermission =
  | "profile.manage" | "saved.manage" | "searches.manage" | "comparisons.manage" | "visits.own" | "enquiries.own"
  | "owner.access" | "listings.own" | "verification.request"
  | "agent.access" | "leads.manage" | "clients.manage" | "followups.manage"
  | "manager.access"
  | AdminPermission;

const USER: AppPermission[] = ["profile.manage","saved.manage","searches.manage","comparisons.manage","visits.own","enquiries.own","owner.access","listings.own","verification.request"];
const OWNER: AppPermission[] = [...USER,"owner.access","listings.own","verification.request","admin.access","users.manage","users.changeRole","users.assignAdmin","listings.moderate","verification.review","reports.moderate","enquiries.manage","visits.manage","payments.view","payments.refund","plans.edit","subscriptions.manage","services.manage","analytics.view","settings.view","settings.edit","audit.view","support.manage"];
const AGENT: AppPermission[] = [...USER,"agent.access","listings.own","leads.manage","clients.manage","followups.manage"];
const PROPERTY_MANAGER: AppPermission[] = [...USER,"manager.access"];
const ADMIN_BASE: AppPermission[] = USER.filter((permission) => !["owner.access","listings.own","verification.request"].includes(permission));
const base: Record<AuthRole, AppPermission[]> = { USER, OWNER, AGENT, PROPERTY_MANAGER, ADMIN: ADMIN_BASE };

export function hasPermission(role: AuthRole, permission: AppPermission): boolean {
  if (base[role].includes(permission)) return true;
  return canAdmin(role, permission as AdminPermission);
}

/** Only OWNER may create/remove ADMIN accounts or change privileged roles. */
export function canAssignRole(actor: AuthRole, target: AuthRole, subjectCurrent: AuthRole): boolean {
  if (actor !== "OWNER" || !hasPermission(actor, "users.assignAdmin")) return false;
  return target !== "OWNER" && subjectCurrent !== "OWNER";
}

export const AREA_ROLES = {
  authenticated: [...ROLES] as AuthRole[],
  dashboard: ["USER"] as AuthRole[],
  owner: ["OWNER"] as AuthRole[],
  ownerCompany: ["OWNER"] as AuthRole[],
  agent: ["AGENT","ADMIN"] as AuthRole[],
  admin: ["OWNER","ADMIN"] as AuthRole[],
} as const;

export function getRoleDashboardPath(role: AuthRole): "/dashboard" | "/admin" | "/owner" | "/account" {
  if (role === "OWNER") return "/owner";
  if (role === "ADMIN") return "/admin";
  if (role === "USER") return "/dashboard";
  return "/account";
}
export type Area = keyof typeof AREA_ROLES;

export const roleLabel: Record<AuthRole, string> = {
  USER: "Home seeker", OWNER: "Platform Owner", AGENT: "Agent", PROPERTY_MANAGER: "Property manager", ADMIN: "Admin",
};

export type SafeUser = {
  id: string; name: string; email: string | null; phone: string | null;
  role: AuthRole; status: AccountStatus; emailVerified: boolean; verifiedBadge: boolean; createdAt: string; updatedAt: string;
};

export const AUTH_ERRORS = { SUSPENDED: "ACCOUNT_SUSPENDED", DEACTIVATED: "ACCOUNT_DEACTIVATED", PENDING: "ACCOUNT_PENDING" } as const;

