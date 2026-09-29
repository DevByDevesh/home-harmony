import { createLocalStore } from "./local-store";

/** Role model mirrors the future auth backend (email, phone OTP, Google OAuth). No sign-in exists yet. */
export type Role = "USER" | "OWNER" | "AGENT" | "PROPERTY_MANAGER" | "ADMIN" | "SUPER_ADMIN";
export const roleInfo: Record<Role, { label: string; home: "/dashboard" | "/owner" | "/agent" | "/admin" | null }> = {
  USER: { label: "Home seeker", home: "/dashboard" },
  OWNER: { label: "Owner", home: "/owner" },
  AGENT: { label: "Agent", home: "/agent" },
  PROPERTY_MANAGER: { label: "Property manager", home: null },
  ADMIN: { label: "Admin", home: "/admin" },
  SUPER_ADMIN: { label: "Super admin", home: "/admin" },
};
/** Roles with a working dashboard in this phase. */
export const previewableRoles: Role[] = ["USER", "OWNER", "AGENT", "ADMIN", "SUPER_ADMIN"];

/** Demo-only preview role. It grants nothing — real authorization must be enforced server-side. */
const store = createLocalStore<{ role: Role }>("houseprovider.demo-role.v1", () => ({ role: "USER" }));
export const useDemoRole = () => store.use().data.role;
export const setDemoRole = (role: Role) => store.update(() => ({ role }));
