import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { adminHead } from "@/lib/admin/head";
import { LiveVisitsPanel } from "@/components/admin/live-records";

export const Route = createFileRoute("/admin/visits")({
  head: adminHead("Visits"),
  component: AdminVisits,
});

function AdminVisits() {
  return <>
    <AdminHeader title="Visits" intro="Live visit requests from PostgreSQL. Status changes use the same transition rules as the owner and seeker flows."/>
    <LiveVisitsPanel />
  </>;
}