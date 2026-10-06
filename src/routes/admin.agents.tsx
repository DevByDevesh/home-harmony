import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { RealAccountsPanel } from "@/components/admin/real-accounts";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/agents")({
  head: adminHead("Agents"),
  component: () => <>
    <AdminHeader title="Agents" intro="Real agent accounts registered in PostgreSQL. Role and access changes are authorized and audited on the server." actions={<Link to="/agent" className="admin-link">Open agent CRM</Link>}/>
    <RealAccountsPanel roles={["AGENT"]} title="Agent accounts in the database"/>
  </>,
});