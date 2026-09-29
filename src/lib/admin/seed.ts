/** Fictional demo seed. Names are invented; emails use the reserved example.com domain. */
import { listings } from "@/lib/catalog";
import type { Role } from "@/lib/roles";
import type {
  AdminProperty, AdminUser, AdminVisit, AuditLog, Enquiry, FeaturedListing, Invoice, Payment, Report,
  ServiceProvider, ServiceRequest, Subscription, VerificationCase,
} from "./types";
import { defaultCategories } from "./config";

const day = (n: number, h = 10) => new Date(Date.UTC(2026, 8, 1 + n, h, 0)).toISOString();
const people: [string, Role, string, string?][] = [
  ["Aarav Kulkarni", "USER", "Pune"], ["Meera Iyer", "OWNER", "Bengaluru"], ["Rohan Deshpande", "OWNER", "Pune"],
  ["Sana Qureshi", "AGENT", "Mumbai", "Harbourline Realty (fictional)"], ["Vikram Rao", "AGENT", "Hyderabad", "Deccan Keys (fictional)"],
  ["Ishita Banerjee", "USER", "Delhi NCR"], ["Kabir Malhotra", "OWNER", "Mumbai"], ["Ananya Pillai", "PROPERTY_MANAGER", "Chennai"],
  ["Dev Patel", "USER", "Ahmedabad"], ["Nisha Wankhede", "OWNER", "Nagpur"], ["Arjun Menon", "AGENT", "Bengaluru", "Lakeview Homes (fictional)"],
  ["Tara Joshi", "USER", "Pune"], ["Farhan Shaikh", "USER", "Mumbai"], ["Priya Nair", "ADMIN", "Pune"], ["Admin Demo", "SUPER_ADMIN", "Pune"],
  ["Lakshmi Reddy", "OWNER", "Hyderabad"],
];
const statuses: AdminUser["status"][] = ["ACTIVE", "ACTIVE", "ACTIVE", "PENDING", "ACTIVE", "SUSPENDED", "ACTIVE", "ACTIVE", "DEACTIVATED", "ACTIVE", "ACTIVE", "PENDING", "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE"];
const verif: AdminUser["verification"][] = ["NOT_REQUESTED", "PENDING", "NOT_REQUESTED", "PENDING", "REJECTED", "NOT_REQUESTED", "EXPIRED", "NOT_REQUESTED", "NOT_REQUESTED", "PENDING", "NOT_REQUESTED", "NOT_REQUESTED", "NOT_REQUESTED", "NOT_REQUESTED", "NOT_REQUESTED", "PENDING"];

export const seedUsers: AdminUser[] = people.map(([name, role, city, agency], i) => ({
  id: `u-${i + 1}`, name, role, city, agency, email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
  status: statuses[i]!, verification: verif[i]!, joinedAt: day(i - 30), lastActiveAt: day(20 + (i % 7), 9 + i % 8),
  planId: role === "AGENT" ? "AGENT_PRO" : role === "OWNER" && i % 2 ? "OWNER_PRO" : "FREE",
  leads: role === "AGENT" ? 8 + i : undefined, visits: role === "AGENT" ? 2 + (i % 4) : undefined,
}));
const owners = seedUsers.filter(u => u.role === "OWNER");
const agents = seedUsers.filter(u => u.role === "AGENT");
const seekers = seedUsers.filter(u => u.role === "USER");
const pStatus: AdminProperty["status"][] = ["ACTIVE", "UNDER_REVIEW", "ACTIVE", "PAUSED", "UNDER_REVIEW", "ACTIVE", "RENTED", "EXPIRED", "ACTIVE"];

export const seedProperties: AdminProperty[] = listings.map((l, i) => ({
  id: `p-${l.slug.split("-").pop()}`, slug: l.slug, title: l.name, locality: l.neighborhood, city: l.city, price: l.price, mode: l.mode,
  ownerId: owners[i % owners.length]!.id, agentId: i % 3 === 0 ? agents[i % agents.length]!.id : undefined,
  status: pStatus[i]!, verification: "NOT_REQUESTED", reports: i === 4 ? 2 : i === 7 ? 1 : 0, featured: i === 0, updatedAt: day(18 + i),
}));

const vTypes: VerificationCase["type"][] = ["OWNER_IDENTITY", "PHONE", "LOCATION", "PROPERTY", "PHOTOS", "AVAILABILITY", "AGENT", "OWNER_IDENTITY"];
const vStatus: VerificationCase["status"][] = ["PENDING", "IN_REVIEW", "PENDING", "PENDING", "REJECTED", "EXPIRED", "PENDING", "IN_REVIEW"];
export const seedVerifications: VerificationCase[] = vTypes.map((type, i) => ({
  id: `v-${i + 1}`, type, status: vStatus[i]!, userId: type === "AGENT" ? agents[0]!.id : owners[i % owners.length]!.id,
  propertyId: ["LOCATION", "PROPERTY", "PHOTOS", "AVAILABILITY"].includes(type) ? seedProperties[i]!.id : undefined,
  submittedAt: day(15 + i), updatedAt: day(18 + i), reviewer: vStatus[i] === "PENDING" ? undefined : "Priya Nair", notes: [],
  history: [{ at: day(15 + i), by: "System (demo)", text: "Check requested by account holder" }],
}));

export const seedReports: Report[] = [
  { id: "r-1", category: "INCORRECT_INFO", status: "OPEN", priority: "MEDIUM", summary: "Reporter says the listed area looks smaller than described.", reporterId: seekers[0]!.id, propertyId: seedProperties[4]!.id, subjectUserId: seedProperties[4]!.ownerId, createdAt: day(22), notes: [] },
  { id: "r-2", category: "DUPLICATE", status: "IN_REVIEW", priority: "LOW", summary: "Possible duplicate of another listing in the same locality.", reporterId: seekers[1]!.id, propertyId: seedProperties[4]!.id, createdAt: day(23), assignee: "Priya Nair", notes: [] },
  { id: "r-3", category: "SUSPICIOUS_ACTIVITY", status: "OPEN", priority: "HIGH", summary: "Reporter was asked for a token amount before any visit.", reporterId: seekers[2]!.id, subjectUserId: agents[1]!.id, createdAt: day(24), notes: [] },
  { id: "r-4", category: "SPAM", status: "RESOLVED", priority: "LOW", summary: "Repeated promotional messages.", reporterId: seekers[3]!.id, subjectUserId: seekers[4]!.id, createdAt: day(12), notes: [] },
  { id: "r-5", category: "PAYMENT_ISSUE", status: "OPEN", priority: "URGENT", summary: "Subscription charge shown twice on the reporter's statement.", reporterId: owners[1]!.id, createdAt: day(25), notes: [] },
  { id: "r-6", category: "FAKE_LISTING", status: "DISMISSED", priority: "MEDIUM", summary: "Photos believed to be from another site; no match found.", reporterId: seekers[0]!.id, propertyId: seedProperties[7]!.id, createdAt: day(10), notes: [] },
];

const eStatus: Enquiry["status"][] = ["NEW", "CONTACTED", "IN_PROGRESS", "NEW", "RESOLVED", "CLOSED", "NEW"];
export const seedEnquiries: Enquiry[] = eStatus.map((status, i) => {
  const p = seedProperties[i % seedProperties.length]!;
  return { id: `e-${i + 1}`, userId: seekers[i % seekers.length]!.id, propertyId: p.id, handlerId: p.agentId ?? p.ownerId, status, createdAt: day(19 + i), lastActivityAt: day(21 + i), notes: [] };
});

const vis: AdminVisit["status"][] = ["REQUESTED", "CONFIRMED", "RESCHEDULED", "REQUESTED", "COMPLETED", "CANCELLED"];
export const seedVisits: AdminVisit[] = vis.map((status, i) => {
  const p = seedProperties[(i * 2) % seedProperties.length]!;
  return { id: `vs-${i + 1}`, propertyId: p.id, userId: seekers[i % seekers.length]!.id, handlerId: p.agentId ?? p.ownerId, date: day(28 + i).slice(0, 10), slot: ["11:00", "15:00", "17:00"][i % 3]!, status };
});

const payStatus: Payment["status"][] = ["SUCCEEDED", "SUCCEEDED", "FAILED", "PENDING", "REFUNDED", "SUCCEEDED", "PROCESSING", "CANCELLED", "SUCCEEDED"];
const products: [string, number][] = [["Owner Pro · monthly", 499], ["Agent Pro · monthly", 1499], ["Featured listing · 14 days", 299], ["Owner Pro · annual", 4990], ["Featured listing · 7 days", 199], ["Agent Pro · monthly", 1499], ["Rental agreement service", 799], ["Owner Pro · monthly", 499], ["Agent Pro · annual", 14990]];
export const seedPayments: Payment[] = products.map(([product, amount], i) => ({
  id: `txn_demo_${1001 + i}`, userId: [...owners, ...agents][i % (owners.length + agents.length)]!.id, product, amount, currency: "INR",
  status: payStatus[i]!, provider: "demo", method: [{ type: "UPI", label: "UPI (demo)" }, { type: "CARD", label: "Card •••• 0000 (demo)" }, { type: "NETBANKING", label: "Net banking (demo)" }][i % 3] as Payment["method"],
  createdAt: day(10 + i * 2), invoiceId: `inv-${1001 + i}`,
}));
export const seedInvoices: Invoice[] = seedPayments.map(p => {
  const base = Math.round(p.amount / 1.18);
  return { id: p.invoiceId, paymentId: p.id, number: `HP-DEMO-${p.invoiceId.slice(4)}`, issuedAt: p.createdAt, lines: [{ label: p.product, amount: base }], tax: p.amount - base };
});

const subStatus: Subscription["status"][] = ["ACTIVE", "TRIAL", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "ACTIVE"];
export const seedSubscriptions: Subscription[] = seedUsers.filter(u => u.planId !== "FREE").map((u, i) => ({
  id: `s-${i + 1}`, userId: u.id, planId: u.planId, status: subStatus[i % subStatus.length]!, startedAt: day(-20 + i), renewsAt: day(35 + i).slice(0, 10), cycle: i % 3 ? "MONTHLY" : "ANNUAL",
}));

export const seedFeatured: FeaturedListing[] = [{ id: "f-1", propertyId: seedProperties[0]!.id, startsAt: day(20).slice(0, 10), endsAt: day(34).slice(0, 10), createdBy: "Priya Nair" }];

const provStatus: ServiceProvider["status"][] = ["ACTIVE", "PENDING", "ACTIVE", "SUSPENDED", "PENDING", "REJECTED", "ACTIVE"];
const provNames: [string, string, number, string][] = [["Rakesh Gupta", "SwiftShift Movers (fictional)", 0, "Pune"], ["Neha Kapoor", "Sparkle Home Care (fictional)", 1, "Mumbai"], ["Imran Khan", "Brushline Painters (fictional)", 2, "Bengaluru"], ["Sunita Das", "FixRight Repairs (fictional)", 5, "Hyderabad"], ["Varun Shah", "NestCraft Interiors (fictional)", 3, "Ahmedabad"], ["Pooja Verma", "PestAway (fictional)", 6, "Delhi NCR"], ["Gopal Iyer", "LeaseRight Legal (fictional)", 8, "Chennai"]];
export const seedProviders: ServiceProvider[] = provNames.map(([name, business, cat, city], i) => ({
  id: `sp-${i + 1}`, name, business, categoryId: defaultCategories[cat]!.id, city, contact: `+91 00000 0000${i} (demo)`,
  verification: i % 3 === 0 ? "PENDING" : "NOT_REQUESTED", demoRating: provStatus[i] === "ACTIVE" ? 4 + (i % 3) / 10 : null,
  status: provStatus[i]!, services: [defaultCategories[cat]!.name], pricingModel: (["QUOTE", "FIXED", "HOURLY"] as const)[i % 3],
}));
const srStatus: ServiceRequest["status"][] = ["NEW", "ASSIGNED", "IN_PROGRESS", "NEW", "COMPLETED", "CANCELLED"];
export const seedServiceRequests: ServiceRequest[] = srStatus.map((status, i) => ({
  id: `sr-${i + 1}`, userId: seekers[i % seekers.length]!.id, categoryId: seedProviders[i % 3 === 1 ? 0 : 2]!.categoryId, city: seedProviders[i % 3 === 1 ? 0 : 2]!.city, status,
  providerId: status === "NEW" || status === "CANCELLED" ? undefined : seedProviders[i % 3 === 1 ? 0 : 2]!.id, createdAt: day(20 + i),
  scheduledFor: status === "NEW" || status === "CANCELLED" ? undefined : day(29 + i).slice(0, 10),
}));

export const seedAudit: AuditLog[] = [
  { id: "a-1", at: day(20, 11), admin: "Priya Nair", action: "Listing featured", target: seedProperties[0]!.title, result: "SUCCESS" },
  { id: "a-2", at: day(12, 15), admin: "Priya Nair", action: "Report resolved", target: "Report r-4", result: "SUCCESS" },
];
