import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { adminHead } from "@/lib/admin/head";
import { LiveEnquiriesPanel } from "@/components/admin/live-records";

export const Route = createFileRoute("/admin/enquiries")({
  head: adminHead("Enquiries"),
  component: AdminEnquiries,
});

function AdminEnquiries() {
  return <>
    <AdminHeader title="Enquiries" intro="Live seeker enquiries from PostgreSQL. Message content is intentionally excluded from this operational view."/>
    <LiveEnquiriesPanel />
  </>;
}