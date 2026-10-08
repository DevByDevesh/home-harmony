/**
 * Phase 6 admin domain models. These mirror the future PostgreSQL/Prisma schema.
 * Today every record is fictional demo data held on this device (see repository.ts).
 */
import type { Role } from "@/lib/roles";
import type { ListingStatus } from "@/lib/catalog";
import type { VisitStatus } from "@/lib/visits";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING" | "DEACTIVATED";
export type OwnerVerification = "NOT_REQUESTED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";

export type AdminUser = {
  id: string; name: string; email: string; city: string; role: Role; status: AccountStatus;
  verification: OwnerVerification; joinedAt: string; lastActiveAt: string;
  agency?: string | undefined; planId: string; leads?: number | undefined; visits?: number | undefined;
};

export type ModerationStatus = ListingStatus | "ARCHIVED";
/** Listing status and verification are separate: approval never implies verified. */
export type AdminProperty = {
  id: string; slug: string; title: string; locality: string; city: string; price: number; mode: "Rent" | "Buy";
  ownerId: string; agentId?: string | undefined; status: ModerationStatus; verification: OwnerVerification;
  reports: number; featured: boolean; updatedAt: string; changesRequested?: string | undefined;
};

export type VerificationType = "OWNER_IDENTITY" | "PHONE" | "LOCATION" | "PROPERTY" | "PHOTOS" | "AVAILABILITY" | "AGENT";
export type VerificationReviewStatus = "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED";
export type Note = { at: string; by: string; text: string };
export type VerificationCase = {
  id: string; type: VerificationType; status: VerificationReviewStatus; userId: string; propertyId?: string | undefined;
  submittedAt: string; updatedAt: string; reviewer?: string | undefined; notes: Note[]; history: Note[];
};

export type ReportCategory = "FAKE_LISTING" | "INCORRECT_INFO" | "DUPLICATE" | "SUSPICIOUS_ACTIVITY" | "HARASSMENT" | "SPAM" | "PAYMENT_ISSUE" | "OTHER";
export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Report = {
  id: string; category: ReportCategory; status: ReportStatus; priority: Priority; summary: string;
  reporterId: string; subjectUserId?: string | undefined; propertyId?: string | undefined;
  createdAt: string; assignee?: string | undefined; notes: Note[];
};

export type EnquiryStatus = "NEW" | "CONTACTED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type Enquiry = { id: string; userId: string; propertyId: string; handlerId: string; status: EnquiryStatus; createdAt: string; lastActivityAt: string; assignee?: string | undefined; notes: Note[] };

export type AdminVisit = { id: string; propertyId: string; userId: string; handlerId: string; date: string; slot: string; status: VisitStatus };

export type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "CANCELLED";
export type PaymentProviderId = "demo" | "razorpay" | "stripe";
export type PaymentMethod = { type: "UPI" | "CARD" | "NETBANKING" | "WALLET"; label: string };
export type Payment = {
  id: string; userId: string; product: string; amount: number; currency: "INR"; status: PaymentStatus;
  provider: PaymentProviderId; method: PaymentMethod; createdAt: string; invoiceId: string; refundRequested?: boolean | undefined;
};
export type Invoice = { id: string; paymentId: string; number: string; issuedAt: string; lines: { label: string; amount: number }[]; tax: number };
export type Refund = { id: string; paymentId: string; amount: number; status: "REQUESTED" | "PROCESSED" | "REJECTED"; requestedAt: string };
export type Transaction = { id: string; paymentId: string; kind: "CHARGE" | "REFUND"; amount: number; at: string };

export type SubscriptionPlan = {
  id: string; name: string; audience: "ALL" | "OWNER" | "AGENT" | "BUSINESS"; enabled: boolean;
  monthly: number; annual: number; listingLimit: number | null; featuredAllowance: number; analytics: boolean;
  leadLimit: number | null; teamSeats: number; marketplace: boolean;
};
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type Subscription = { id: string; userId: string; planId: string; status: SubscriptionStatus; startedAt: string; renewsAt: string; cycle: "MONTHLY" | "ANNUAL" };

export type FeaturedListing = { id: string; propertyId: string; startsAt: string; endsAt: string; createdBy: string };

export type ProviderStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type ServiceCategory = { id: string; name: string; enabled: boolean; commissionPct: number };
export type ServiceProvider = {
  id: string; name: string; business: string; categoryId: string; city: string; contact: string;
  verification: OwnerVerification; demoRating: number | null; status: ProviderStatus; services: string[]; pricingModel: "FIXED" | "QUOTE" | "HOURLY";
};
export type ServiceRequestStatus = "NEW" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ServiceRequest = { id: string; userId: string; categoryId: string; city: string; status: ServiceRequestStatus; providerId?: string | undefined; createdAt: string; scheduledFor?: string | undefined };
/** A booking is a request once a provider is assigned and a slot is agreed. */
export type ServiceBooking = ServiceRequest & { providerId: string; scheduledFor: string };

export type AuditLog = { id: string; at: string; admin: string; action: string; target: string; result: "SUCCESS" | "DENIED" };
