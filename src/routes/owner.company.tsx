import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Building2, ClipboardList, Flag, Settings, ShieldCheck, Users, UserCog, Wrench, CreditCard, MessagesSquare, CalendarCheck } from "lucide-react";
import { guardArea } from "@/lib/auth/route-guard";
import { liveCountsFn } from "@/lib/admin-business.functions";
import { RealAccountsPanel } from "@/components/admin/real-accounts";
import { AdminMetricCard } from "@/components/admin/admin-kit";

export const Route = createFileRoute("/owner/company")({
  beforeLoad: guardArea("ownerCompany"),
  head: () => ({ meta: [
    { title: "Company Owner Dashboard — HouseProvider.in" },
    { name: "robots", content: "noindex, nofollow" },
    { name: "description", content: "Private platform-owner control center for HouseProvider.in." },
  ] }),
  component: CompanyOwnerDashboard,
});

const sections = [
  ["/admin/properties", "Listings", "Manage, approve, suspend and archive platform listings.", Building2],
  ["/admin/users", "Users & admins", "Manage accounts, roles and access.", Users],
  ["/admin/verification", "Verification", "Review platform verification activity.", ShieldCheck],
  ["/admin/reports", "Moderation", "Monitor reports and moderation workload.", Flag],
  ["/admin/enquiries", "Enquiries", "Monitor platform enquiries.", MessagesSquare],
  ["/admin/visits", "Visits", "Monitor property visit activity.", CalendarCheck],
  ["/admin/payments", "Payments", "Review recorded payment activity.", CreditCard],
  ["/admin/services", "Services", "Manage the services marketplace.", Wrench],
  ["/admin/settings", "Platform settings", "Review platform configuration and access settings.", Settings],
  ["/admin/audit", "Audit trail", "Inspect privileged actions and moderation history.", ClipboardList],
] as const;

function CompanyOwnerDashboard() {
  const counts = useQuery({ queryKey: ["owner-company", "counts"], queryFn: () => liveCountsFn() });
  const users = counts.data?.users ?? {};
  const properties = counts.data?.properties ?? {};
  const totalUsers = Object.values(users).reduce((n, v) => n + (typeof v === "number" ? v : 0), 0);
  const activeUsers = users.ACTIVE ?? 0;
  const suspendedUsers = users.SUSPENDED ?? 0;
  const activeListings = properties.ACTIVE ?? 0;
  const reviewListings = properties.UNDER_REVIEW ?? 0;
  const suspendedListings = properties.SUSPENDED ?? 0;

  return <main className="dashboard-page"><div className="wrap">
    <div className="results-intro dash-intro">
      <div><p className="kicker">PLATFORM OWNER</p><h1>Company <em>Control Center.</em></h1><p className="form-hint">Highest-level HouseProvider operations dashboard. Admins handle day-to-day moderation; the Owner controls the platform.</p></div>
    </div>

    <section className="dash-panel" aria-labelledby="owner-overview">
      <div className="owner-company-heading"><div><p className="kicker">OVERVIEW</p><h2 id="owner-overview">Platform health</h2></div><BarChart3 size={22}/></div>
      {counts.isPending ? <p>Loading live platform metrics…</p> : counts.isError ? <p role="alert">{(counts.error as Error).message}</p> :
        <AdminMetricCard items={[
          { label: "Total users", value: totalUsers },
          { label: "Active users", value: activeUsers },
          { label: "Banned / suspended", value: suspendedUsers },
          { label: "Active listings", value: activeListings },
          { label: "Under review", value: reviewListings },
          { label: "Suspended listings", value: suspendedListings },
          { label: "Enquiries", value: counts.data?.enquiries ? Object.values(counts.data.enquiries).reduce((n,v) => n + v, 0) : 0 },
          { label: "Visit requests", value: counts.data?.visits ? Object.values(counts.data.visits).reduce((n,v) => n + v, 0) : 0 },
        ]}/>}
    </section>

    <section className="dash-panel" aria-labelledby="owner-management">
      <p className="kicker">FULL PLATFORM ACCESS</p><h2 id="owner-management">Management</h2>
      <div className="admin-grid-2">
        {sections.map(([to, title, description, Icon]) => <Link key={to} to={to} className="admin-nav-card"><Icon size={19}/><span><strong>{title}</strong><small>{description}</small></span></Link>)}
      </div>
    </section>

    <section className="dash-panel" aria-labelledby="owner-accounts">
      <p className="kicker">ACCOUNT CONTROL</p><h2 id="owner-accounts">Users & administrators</h2>
      <p className="form-hint">The Owner can promote qualified accounts to Admin, remove/demote Admin access, suspend users and manage operational access. The Owner account itself cannot be changed from this panel.</p>
      <RealAccountsPanel title="Platform accounts"/>
    </section>
  </div></main>;
}
