/** Configuration objects. Prices and rules are placeholders — configurable, not final commercial terms. */
import type { SubscriptionPlan, ServiceCategory } from "./types";

export const defaultPlans: SubscriptionPlan[] = [
  { id: "FREE", name: "Free", audience: "ALL", enabled: true, monthly: 0, annual: 0, listingLimit: 1, featuredAllowance: 0, analytics: false, leadLimit: 10, teamSeats: 1, marketplace: true },
  { id: "OWNER_PRO", name: "Owner Pro", audience: "OWNER", enabled: true, monthly: 499, annual: 4990, listingLimit: 5, featuredAllowance: 1, analytics: true, leadLimit: null, teamSeats: 1, marketplace: true },
  { id: "AGENT_PRO", name: "Agent Pro", audience: "AGENT", enabled: true, monthly: 1499, annual: 14990, listingLimit: 50, featuredAllowance: 5, analytics: true, leadLimit: null, teamSeats: 3, marketplace: true },
  { id: "BUSINESS", name: "Business", audience: "BUSINESS", enabled: false, monthly: 4999, annual: 49990, listingLimit: null, featuredAllowance: 20, analytics: true, leadLimit: null, teamSeats: 15, marketplace: true },
];

export const defaultCategories: ServiceCategory[] = [
  "Packers & Movers", "Cleaning", "Painting", "Interior Design", "Furniture Rental", "Home Repairs",
  "Pest Control", "Property Management", "Legal Services", "Home Loans", "Insurance", "Relocation Services",
].map((name, i) => ({ id: `cat-${i + 1}`, name, enabled: i < 10, commissionPct: 10 }));

export type NotificationEvent = "VERIFICATION" | "MODERATION" | "VISIT" | "ENQUIRY" | "SUBSCRIPTION" | "PAYMENT" | "SERVICE_BOOKING" | "REPORT";
export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";
export const notificationEvents: { key: NotificationEvent; label: string }[] = [
  { key: "VERIFICATION", label: "Verification updates" }, { key: "MODERATION", label: "Listing moderation" },
  { key: "VISIT", label: "Visit updates" }, { key: "ENQUIRY", label: "Enquiry updates" },
  { key: "SUBSCRIPTION", label: "Subscription events" }, { key: "PAYMENT", label: "Payment events" },
  { key: "SERVICE_BOOKING", label: "Service booking updates" }, { key: "REPORT", label: "Report updates" },
];
export const notificationChannels: NotificationChannel[] = ["IN_APP", "EMAIL", "SMS", "PUSH"];

export type PlatformSettings = {
  general: { platformName: string; supportEmail: string; defaultCity: string };
  platform: { maintenanceMode: boolean; allowNewSignups: boolean };
  listings: { freshnessDays: number; expireAfterDays: number; maxPhotos: number };
  verification: { availabilityReconfirmDays: number; requireOwnerIdentity: boolean; requirePhone: boolean };
  moderation: { autoPauseAtReports: number; reportCategories: string[] };
  subscriptions: { trialDays: number; gracePeriodDays: number };
  payments: { provider: "demo" | "razorpay" | "stripe"; currency: "INR"; gstPct: number };
  featured: { maxDurationDays: number; maxConcurrent: number };
  services: { defaultCommissionPct: number };
  notifications: Record<NotificationEvent, NotificationChannel[]>;
  security: { adminSessionMinutes: number; requireTwoFactorForAdmins: boolean };
};

export const defaultSettings: PlatformSettings = {
  general: { platformName: "HouseProvider.in", supportEmail: "support@example.com", defaultCity: "Pune" },
  platform: { maintenanceMode: false, allowNewSignups: true },
  listings: { freshnessDays: 14, expireAfterDays: 60, maxPhotos: 20 },
  verification: { availabilityReconfirmDays: 14, requireOwnerIdentity: true, requirePhone: true },
  moderation: { autoPauseAtReports: 3, reportCategories: ["Fake listing", "Incorrect information", "Duplicate listing", "Suspicious activity", "Harassment", "Spam", "Payment issue", "Other"] },
  subscriptions: { trialDays: 14, gracePeriodDays: 7 },
  payments: { provider: "demo", currency: "INR", gstPct: 18 },
  featured: { maxDurationDays: 30, maxConcurrent: 12 },
  services: { defaultCommissionPct: 10 },
  notifications: Object.fromEntries(notificationEvents.map(e => [e.key, ["IN_APP"]])) as Record<NotificationEvent, NotificationChannel[]>,
  security: { adminSessionMinutes: 30, requireTwoFactorForAdmins: true },
};

export const reportCategoryLabel: Record<string, string> = {
  FAKE_LISTING: "Fake listing", INCORRECT_INFO: "Incorrect information", DUPLICATE: "Duplicate listing", SUSPICIOUS_ACTIVITY: "Suspicious activity",
  HARASSMENT: "Harassment", SPAM: "Spam", PAYMENT_ISSUE: "Payment issue", OTHER: "Other",
};
export const verificationTypeLabel: Record<string, string> = {
  OWNER_IDENTITY: "Owner identity", PHONE: "Phone", LOCATION: "Location", PROPERTY: "Property", PHOTOS: "Photos", AVAILABILITY: "Availability", AGENT: "Agent verification",
};
