import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminDemoNote, AdminHeader } from "@/components/admin/admin-kit";
import { PeopleTable } from "@/components/admin/people";
import { RealAccountsPanel } from "@/components/admin/real-accounts";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/agents")({ head: adminHead("Agents"), component: () => <>
  <AdminHeader title="Agents" intro="Agent accounts, agencies, activity and verification." actions={<Link to="/agent" className="admin-link">Open agent CRM</Link>}/>
  <RealAccountsPanel roles={["AGENT"]} title="Agent accounts in the database"/>
  <AdminDemoNote/>
  <PeopleTable roles={["AGENT"]} caption="Agents" emptyTitle="No agents found." extra={[
    () => ({ key: "agency", label: "Agency", render: u => u.agency ?? "Independent", sort: u => u.agency ?? "" }),
    s => ({ key: "listings", label: "Active listings", render: u => s.properties.filter(p => p.agentId === u.id && p.status === "ACTIVE").length }),
    () => ({ key: "leads", label: "Leads · visits", render: u => `${u.leads ?? 0} · ${u.visits ?? 0}`, sort: u => u.leads ?? 0 }),
    s => ({ key: "plan", label: "Plan", render: u => s.plans.find(p => p.id === u.planId)?.name ?? "—" }),
  ]}/>
</> });

