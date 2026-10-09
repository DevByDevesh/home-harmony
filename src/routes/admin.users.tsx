import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { RealAccountsPanel } from "@/components/admin/real-accounts";
import { adminHead } from "@/lib/admin/head";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/users")({
  head: adminHead("Users"),
  component: UsersPage,
});

function UsersPage() {
  const { user } = useCurrentUser();
  const isOwner = user?.role === "OWNER";

  return <>
    <AdminHeader title="Users" intro="Manage registered users and Admin access. Platform Owner accounts are kept separate and are visible here only to the Platform Owner." />
    <RealAccountsPanel roles={["USER"]} title="User accounts" />
    <RealAccountsPanel roles={["ADMIN"]} title="Admin accounts" />
    {isOwner ? <RealAccountsPanel roles={["OWNER"]} title="Platform Owner accounts" /> : null}
  </>;
}
