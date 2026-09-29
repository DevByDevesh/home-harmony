/**
 * Admin repository seam. Today: a device-local store seeded with fictional records.
 * Later: replace `store` reads/writes with server functions backed by PostgreSQL —
 * each action already has a stable signature and writes an audit entry.
 * TODO(server-auth): every action must be re-authorised server-side.
 */
import { toast } from "sonner";
import { createLocalStore, uid } from "@/lib/local-store";
import type { Role } from "@/lib/roles";
import { useDemoRole } from "@/lib/roles";
import { can, type AdminPermission } from "./permissions";
import { defaultCategories, defaultPlans, defaultSettings, type PlatformSettings } from "./config";
import * as seed from "./seed";
import type { AuditLog, FeaturedListing, Note, ServiceCategory, SubscriptionPlan } from "./types";

function initial() {
  return {
    users: seed.seedUsers, properties: seed.seedProperties, verifications: seed.seedVerifications, reports: seed.seedReports,
    enquiries: seed.seedEnquiries, visits: seed.seedVisits, payments: seed.seedPayments, invoices: seed.seedInvoices,
    refunds: [] as { id: string; paymentId: string; amount: number; status: "REQUESTED"; requestedAt: string }[],
    plans: defaultPlans, subscriptions: seed.seedSubscriptions, featured: seed.seedFeatured, providers: seed.seedProviders,
    categories: defaultCategories, serviceRequests: seed.seedServiceRequests, audit: seed.seedAudit, settings: defaultSettings,
  };
}
export type AdminState = ReturnType<typeof initial>;
type Collection = "users" | "properties" | "verifications" | "reports" | "enquiries" | "visits" | "payments" | "subscriptions" | "providers" | "serviceRequests" | "categories" | "plans";

const store = createLocalStore<AdminState>("houseprovider.admin.v1", initial);
export const useAdminData = () => store.use();

const actorName = (role: Role) => role === "SUPER_ADMIN" ? "Admin Demo (super admin)" : "Priya Nair (admin)";
export const DEMO_NOTICE = "Demo action — saved on this device only, no live backend update.";

function log(role: Role, action: string, target: string, result: AuditLog["result"] = "SUCCESS") {
  store.update(s => ({ ...s, audit: [{ id: uid(), at: new Date().toISOString(), admin: actorName(role), action, target, result }, ...s.audit].slice(0, 300) }));
}

/** Guarded mutation: checks permission, applies patch, writes audit, gives honest feedback. */
function run(role: Role, permission: AdminPermission, action: string, target: string, apply: (s: AdminState) => AdminState) {
  if (!can(role, permission)) { log(role, action, target, "DENIED"); toast.error("You don't have permission for this action."); return false; }
  store.update(apply); log(role, action, target); toast.success(action, { description: DEMO_NOTICE }); return true;
}
function patch<C extends Collection>(s: AdminState, c: C, id: string, p: Partial<AdminState[C][number]>): AdminState {
  return { ...s, [c]: (s[c] as { id: string }[]).map(r => r.id === id ? { ...r, ...p } : r) };
}
const now = () => new Date().toISOString();

export function useAdminActions() {
  const role = useDemoRole();
  const who = actorName(role);
  const note = (text: string): Note => ({ at: now(), by: who, text });
  return {
    role, who,
    can: (p: AdminPermission) => can(role, p),
    update<C extends Collection>(c: C, id: string, p: Partial<AdminState[C][number]>, action: string, target: string, permission: AdminPermission) {
      return run(role, permission, action, target, s => patch(s, c, id, p));
    },
    addNote(c: "verifications" | "reports" | "enquiries", id: string, text: string, target: string) {
      const perm: AdminPermission = c === "verifications" ? "verification.review" : c === "reports" ? "reports.moderate" : "enquiries.manage";
      return run(role, perm, "Internal note added", target, s => ({ ...s, [c]: (s[c] as { id: string; notes: Note[] }[]).map(r => r.id === id ? { ...r, notes: [...r.notes, note(text)] } : r) }));
    },
    reviewVerification(id: string, status: AdminState["verifications"][number]["status"], target: string, message?: string) {
      const labels = { IN_REVIEW: "Verification review started", VERIFIED: "Verification approved", REJECTED: "Verification rejected", PENDING: "Additional information requested", EXPIRED: "Verification expired" } as const;
      return run(role, "verification.review", labels[status], target, s => ({ ...s, verifications: s.verifications.map(v => v.id === id ? { ...v, status, reviewer: who, updatedAt: now(), history: [...v.history, note(message ?? labels[status])] } : v) }));
    },
    setFeatured(propertyId: string, window: { startsAt: string; endsAt: string } | null, target: string) {
      return run(role, "listings.moderate", window ? "Listing featured" : "Featured status removed", target, s => ({
        ...s, properties: s.properties.map(p => p.id === propertyId ? { ...p, featured: !!window } : p),
        featured: window ? [...s.featured.filter(f => f.propertyId !== propertyId), { id: uid(), propertyId, ...window, createdBy: who } satisfies FeaturedListing] : s.featured.filter(f => f.propertyId !== propertyId),
      }));
    },
    requestRefund(paymentId: string, amount: number) {
      return run(role, "payments.refund", "Refund requested (placeholder)", paymentId, s => ({ ...s, payments: patch(s, "payments", paymentId, { refundRequested: true }).payments, refunds: [...s.refunds, { id: uid(), paymentId, amount, status: "REQUESTED" as const, requestedAt: now() }] }));
    },
    savePlan(plan: SubscriptionPlan) { return run(role, "plans.edit", "Subscription plan updated", plan.name, s => ({ ...s, plans: s.plans.map(p => p.id === plan.id ? plan : p) })); },
    saveCategory(cat: ServiceCategory) { return run(role, "services.manage", "Service category updated", cat.name, s => ({ ...s, categories: s.categories.map(c => c.id === cat.id ? cat : c) })); },
    saveSettings(section: keyof PlatformSettings, value: PlatformSettings[keyof PlatformSettings]) {
      return run(role, "settings.edit", "Settings updated", `Settings · ${section}`, s => ({ ...s, settings: { ...s.settings, [section]: value } }));
    },
    reset() { store.reset(); toast("Admin demo data reset", { description: DEMO_NOTICE }); },
  };
}
export type AdminActions = ReturnType<typeof useAdminActions>;

/** Lookup helpers used across admin screens. */
export function lookups(s: AdminState) {
  const user = (id?: string) => s.users.find(u => u.id === id);
  const property = (id?: string) => s.properties.find(p => p.id === id);
  return { user, property, userName: (id?: string) => user(id)?.name ?? "—", propertyTitle: (id?: string) => property(id)?.title ?? "—", plan: (id: string) => s.plans.find(p => p.id === id), category: (id: string) => s.categories.find(c => c.id === id) };
}
