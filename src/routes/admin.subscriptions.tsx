import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { LivePlansPanel, LiveSubscriptionsPanel } from "@/components/admin/live-business";
import { adminHead } from "@/lib/admin/head";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { can } from "@/lib/admin/permissions";

export const Route = createFileRoute("/admin/subscriptions")({
  head: adminHead("Subscriptions"),
  component: AdminSubscriptions,
});

function AdminSubscriptions() {
  const role = useCurrentUser().user?.role ?? "USER";
  const canEdit = can(role, "plans.edit");
  return <>
    <AdminHeader title="Subscriptions" intro="Live plan configuration and subscription records from PostgreSQL. Billing remains in Demo mode until a real payment provider is configured."/>
    <LivePlansPanel canEdit={canEdit}/>
    <LiveSubscriptionsPanel />
  </>;
}