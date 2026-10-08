export const SUPPORT_EMAIL = "support@houseprovider.in";
export const SUPPORT_CATEGORIES = ["ACCOUNT", "LISTING", "PAYMENT", "ABUSE", "TECHNICAL", "OTHER"] as const;
export const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"] as const;
export const SUPPORT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function supportContactUrls(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return { call: `tel:+${digits}`, whatsapp: `https://wa.me/${digits}` };
}
