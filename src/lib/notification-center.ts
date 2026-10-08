export const NOTIFICATION_TYPES = [
  "MESSAGE_RECEIVED",
  "ENQUIRY_RECEIVED",
  "OWNER_PHONE_REQUESTED",
  "OWNER_CALL_REQUESTED",
  "VISIT_REQUESTED",
  "VISIT_CONFIRMED",
  "LISTING_APPROVED",
  "LISTING_REJECTED",
  "LISTING_EXPIRING",
  "LISTING_EXPIRED",
  "LISTING_SUSPENDED",
  "SAVED_SEARCH_MATCH",
  "SUPPORT_TICKET_UPDATED",
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

const labels: Record<NotificationType, string> = {
  MESSAGE_RECEIVED: "New message",
  ENQUIRY_RECEIVED: "New enquiry",
  OWNER_PHONE_REQUESTED: "Phone request",
  OWNER_CALL_REQUESTED: "Phone request",
  VISIT_REQUESTED: "Visit request",
  VISIT_CONFIRMED: "Visit accepted",
  LISTING_APPROVED: "Listing approved",
  LISTING_REJECTED: "Listing rejected",
  LISTING_EXPIRING: "Listing expiring",
  LISTING_EXPIRED: "Listing expired",
  LISTING_SUSPENDED: "Listing suspended",
  SAVED_SEARCH_MATCH: "Matching property found",
  SUPPORT_TICKET_UPDATED: "Support ticket update",
};

export function notificationTypeLabel(type: string): string {
  return (labels as Record<string, string>)[type] ?? "HouseProvider update";
}
