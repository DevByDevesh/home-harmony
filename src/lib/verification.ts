/** Verification architecture. Only a real backend check may ever set a state to VERIFIED. */
export type VerificationState = "NOT_REQUESTED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
export type VerificationKey = "ownerIdentity" | "phone" | "location" | "listingReview" | "photos" | "availability";
export type VerificationItem = { state: VerificationState; updatedAt: string | null; note?: string | undefined };
export type VerificationRecord = Record<VerificationKey, VerificationItem>;

export const verificationItems: { key: VerificationKey; label: string; how: string }[] = [
  { key: "ownerIdentity", label: "Owner identity", how: "Checked against an identity document by the moderation team." },
  { key: "phone", label: "Phone", how: "Confirmed with a one-time code sent by SMS." },
  { key: "location", label: "Location", how: "Address matched to the map pin and supporting documents." },
  { key: "listingReview", label: "Listing review", how: "Details and price reviewed by a moderator." },
  { key: "photos", label: "Photos", how: "Photos checked for duplicates and accuracy." },
  { key: "availability", label: "Availability", how: "Owner reconfirms availability every 14 days." },
];
export const stateLabel: Record<VerificationState, string> = { NOT_REQUESTED: "Not requested", PENDING: "Pending", VERIFIED: "Verified", REJECTED: "Rejected", EXPIRED: "Expired" };

export function emptyRecord(): VerificationRecord {
  return Object.fromEntries(verificationItems.map(i => [i.key, { state: "NOT_REQUESTED", updatedAt: null }])) as VerificationRecord;
}
/** Request checks: moves NOT_REQUESTED/REJECTED/EXPIRED items to PENDING. Never verifies. */
export function requestChecks(record: VerificationRecord, keys: VerificationKey[], at = new Date().toISOString()): VerificationRecord {
  const next = { ...record };
  for (const k of keys) if (next[k].state !== "VERIFIED" && next[k].state !== "PENDING") next[k] = { state: "PENDING", updatedAt: at };
  return next;
}
export const isFullyVerified = (r: VerificationRecord) => verificationItems.every(i => r[i.key].state === "VERIFIED");
export const verifiedCount = (r: VerificationRecord) => verificationItems.filter(i => r[i.key].state === "VERIFIED").length;
