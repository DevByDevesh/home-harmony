import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { LivePaymentsPanel } from "@/components/admin/live-business";
import { adminHead } from "@/lib/admin/head";
import { getPaymentProvider } from "@/lib/payments/provider";

export const Route = createFileRoute("/admin/payments")({
  head: adminHead("Payments"),
  component: AdminPayments,
});

function AdminPayments() {
  const provider = getPaymentProvider();
  return <>
    <AdminHeader title="Payments" intro={`Gateway: ${provider.label}. No real money moves until a live payment provider is configured.`}/>
    <LivePaymentsPanel canRefund={false}/>
  </>;
}