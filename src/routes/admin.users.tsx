import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { RealAccountsPanel } from "@/components/admin/real-accounts";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/users")({
  head: adminHead("Users"),
  component: () => <>
    <AdminHeader title="Users" intro="Manage real registered accounts. Role and access changes are authorized and audited on the server; records are never deleted from here."/>
    <RealAccountsPanel title="Registered accounts in the database"/>
  </>,
});