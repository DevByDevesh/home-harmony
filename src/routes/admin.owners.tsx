import { createFileRoute } from "@tanstack/react-router";
import { AdminHeader } from "@/components/admin/admin-kit";
import { PeopleTable } from "@/components/admin/people";
import { RealAccountsPanel } from "@/components/admin/real-accounts";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/owners")({ head: adminHead("Owners"), component: () => <>
  <AdminHeader title="Owners" intro="Owner accounts, their listings and verification state (same states as the owner dashboard)."/>
  <RealAccountsPanel roles={["OWNER"]} title="Owner accounts in the database"/>
  <p className="admin-note">Property owners registered on HouseProvider will appear here.</p>
  <PeopleTable roles={["OWNER"]} caption="Owners" emptyTitle="No owners found." extra={[
    s => ({ key: "listings", label: "Listings", render: u => { const p = s.properties.filter(x => x.ownerId === u.id); return `${p.length} total · ${p.filter(x => x.status === "ACTIVE").length} active · ${p.filter(x => x.status === "UNDER_REVIEW").length} pending`; }, sort: u => s.properties.filter(x => x.ownerId === u.id).length }),
    s => ({ key: "plan", label: "Plan", render: u => s.plans.find(p => p.id === u.planId)?.name ?? "—" }),
  ]}/>
</> });


