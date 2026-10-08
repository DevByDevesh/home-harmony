import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { LiveServicesPanel } from "@/components/admin/live-business";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/services")({
  head: adminHead("Services"),
  component: AdminServices,
});

function AdminServices() {
  return <>
    <AdminHeader
      title="Services marketplace"
      intro="Live service categories, providers and requests from PostgreSQL. Provider assignment and request status changes are server-authorized."
    />
    <LiveServicesPanel />
    <p className="admin-note">
      Service providers are shown only after registration and onboarding. No provider is contacted automatically.
    </p>
  </>;
}
