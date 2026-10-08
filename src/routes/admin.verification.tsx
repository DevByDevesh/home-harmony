import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { adminHead } from "@/lib/admin/head";
import { LiveVerificationsPanel } from "@/components/admin/live-trust";

export const Route = createFileRoute("/admin/verification")({
  head: adminHead("Verification"),
  component: AdminVerification,
});

function AdminVerification() {
  return <>
    <AdminHeader
      title="Verification center"
      intro="Review live verification requests from PostgreSQL. Verification is separate from listing approval and never guarantees trust or safety."
    />
    <LiveVerificationsPanel />
  </>;
}
