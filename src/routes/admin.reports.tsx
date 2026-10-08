import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { adminHead } from "@/lib/admin/head";
import { LiveReportsPanel } from "@/components/admin/live-trust";

export const Route = createFileRoute("/admin/reports")({
  head: adminHead("Reports"),
  component: AdminReports,
});

function AdminReports() {
  return <>
    <AdminHeader
      title="Reports & moderation"
      intro="Review live reports from PostgreSQL. A report is evidence for review, not proof of wrongdoing."
    />
    <LiveReportsPanel />
  </>;
}
