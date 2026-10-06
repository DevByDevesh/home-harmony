import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { RealAccountsPanel } from "@/components/admin/real-accounts";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/owners")({
  head: adminHead("Owners"),
  component: () => <>
    <AdminHeader title="Owners" intro="Real owner accounts registered in PostgreSQL. Role and access changes are authorized and audited on the server."/>
    <RealAccountsPanel roles={["OWNER"]} title="Owner accounts in the database"/>
  </>,
});