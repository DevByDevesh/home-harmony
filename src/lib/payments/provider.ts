/**
 * Payment provider seam. Provider SDKs (Razorpay, Stripe) must live server-side only,
 * reading secrets from server env inside server functions. Nothing here holds a key.
 */
import type { Payment, PaymentProviderId, Refund } from "@/lib/admin/types";

export interface PaymentProvider {
  id: PaymentProviderId;
  label: string;
  live: boolean;
  /** Create a checkout/order. Real providers run in a server function. */
  createPayment(input: { userId: string; amount: number; product: string }): Promise<{ ok: false; reason: string } | { ok: true; paymentId: string }>;
  requestRefund(payment: Payment): Promise<{ ok: false; reason: string } | { ok: true; refund: Refund }>;
}

const demoProvider: PaymentProvider = {
  id: "demo", label: "Demo (no gateway)", live: false,
  async createPayment() { return { ok: false, reason: "No payment gateway is connected. Checkout is unavailable in demo mode." }; },
  async requestRefund(payment) {
    return { ok: true, refund: { id: `rf-${payment.id}`, paymentId: payment.id, amount: payment.amount, status: "REQUESTED", requestedAt: new Date().toISOString() } };
  },
};

export const providerLabels: Record<PaymentProviderId, string> = { demo: "Demo", razorpay: "Razorpay (not connected)", stripe: "Stripe (not connected)" };
/** Swap for a server-backed provider once credentials exist. */
export function getPaymentProvider(): PaymentProvider { return demoProvider; }
