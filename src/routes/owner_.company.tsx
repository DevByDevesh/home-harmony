import { guardArea } from "@/lib/auth/route-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BarChart3, BadgeCheck, Building2, ClipboardList, Flag, Gauge, Settings , Users, UserCog } from "lucide-react";
import { AdminAuditTimeline, AdminChartCard, AdminHeader, AdminLoadingState, AdminMetricCard, Distribution } from "@/components/admin/admin-kit";
import { liveCountsFn, adminTrendsFn } from "@/lib/admin-business.functions";
import { adminListAuditFn } from "@/lib/admin-trust.functions";

export const Route = createFileRoute("/owner/company")({
  beforeLoad: guardArea("owner"),
  head: () => ({ meta: [
    { title: "Company Owner Dashboard — HouseProvider.in" },
    { name: "robots", content: "noindex, nofollow" },
    { name: "description", content: "Platform-wide HouseProvider analytics, access, moderation and management." },
  ] }),
  component: CompanyOwnerDashboard,
});

const lc = (s: string) => s.replaceAll("_", " ").toLowerCase();
const sum = (o: Record<string, number> | undefined) => o ? Object.values(o).reduce((a, b) => a + b, 0) : 0;
const toDist = (o: Record<string, number> | undefined) => o ? Object.entries(o).map(([k, v]) => ({ label: lc(k), value: v })) : [];

function CompanyOwnerDashboard() {
  const counts = useQuery({ queryKey: ["owner-platform", "counts"], queryFn: () => liveCountsFn() });
  const trends = useQuery({ queryKey: ["owner-platform", "trends", 30], queryFn: () => adminTrendsFn({ data: { days: 30 } }) });
  const audit = useQuery({ queryKey: ["owner-platform", "audit"], queryFn: () => adminListAuditFn() });

  if (counts.isPending) return <main className="admin-page wrap"><AdminHeader title="Company Owner Dashboard" intro="Loading platform operations…"/><AdminLoadingState/></main>;
  if (counts.isError) return <main className="admin-page wrap"><AdminHeader title="Company Owner Dashboard" intro="Platform-wide control center for HouseProvider."/><p role="alert">{(counts.error as Error).message}</p></main>;

  const c = counts.data!;
  const pendingVerification = (trends.data?.verificationStatuses["PENDING"] ?? 0) + (trends.data?.verificationStatuses["IN_REVIEW"] ?? 0);

  return <main className="admin-page wrap">
    <AdminHeader
      title="Company Owner Dashboard"
      intro="Platform-wide control center. Monitor the business, manage access, review moderation and jump into every operational area."
      actions={<span className="admin-signed"><strong>OWNER</strong> · Highest-level platform account</span>}
    />

    <AdminMetricCard items={[
      { label: "Total accounts", value: sum(c.users) },
      { label: "Owners", value: c.users["OWNER"] ?? 0 },
      { label: "Admins", value: (c.users["ADMIN"] ?? 0) + (c.users["SUPER_ADMIN"] ?? 0) },
      { label: "Active listings", value: c.properties["ACTIVE"] ?? 0 },
      { label: "Under review", value: c.properties["UNDER_REVIEW"] ?? 0 },
      { label: "Verification waiting", value: pendingVerification },
      { label: "Open enquiries", value: c.enquiries["NEW"] ?? 0 },
      { label: "Visit requests", value: sum(c.visits) },
      { label: "Subscriptions", value: sum(c.subscriptions) },
      { label: "Succeeded payments", value: c.paidCount },
    ]}/>

    <section className="admin-section">
      <div className="admin-section-head"><h2>Platform management</h2><span className="form-hint">Owner-only entry point to existing live operational modules.</span></div>
      <div className="admin-grid-2">
        <OwnerAction href="/admin/users" icon={<Users size={20}/>} title="Users & Admins" text="Create/promote/demote operational roles and manage user access, including ban and restore."/>
        <OwnerAction href="/admin/properties" icon={<Building2 size={20}/>} title="Listings" text="Manage platform listings and moderation state across the marketplace."/>
        <OwnerAction href="/admin/verification" icon={<BadgeCheck size={20}/>} title="Verification" text="Monitor verification checks and review pending trust actions."/>
        <OwnerAction href="/admin/reports" icon={<Flag size={20}/>} title="Moderation & Reports" text="Monitor reports and handle platform safety issues."/>
        <OwnerAction href="/admin/analytics" icon={<BarChart3 size={20}/>} title="Overall Analytics" text="Open the full analytics workspace with platform trends and live distributions."/>
        <OwnerAction href="/admin/settings" icon={<Settings size={20}/>} title="Platform Settings" text="Review platform configuration and access controls."/>
        <OwnerAction href="/admin/audit" icon={<ClipboardList size={20}/>} title="Access & Audit Log" text="Review who changed what, when, and the recorded moderation trail."/>
        <OwnerAction href="/admin" icon={<Gauge size={20}/>} title="Operations Center" text="Open the complete admin operations workspace."/>
      </div>
    </section>

    {trends.isPending ? <AdminLoadingState label="Loading platform analytics"/> : trends.isError ? <p role="alert">{(trends.error as Error).message}</p> :
      <section className="admin-section">
        <div className="admin-section-head"><h2>Platform analytics · last 30 days</h2><Link to="/admin/analytics">Full analytics</Link></div>
        <div className="admin-grid-2">
          <AdminChartCard title="New accounts" data={trends.data.series["New accounts"] ?? []}/>
          <AdminChartCard title="New listings" data={trends.data.series["New listings"] ?? []} kind="bar"/>
          <AdminChartCard title="Visit requests" data={trends.data.series["Visit requests"] ?? []}/>
          <AdminChartCard title="Enquiries" data={trends.data.series["Enquiries"] ?? []} kind="bar"/>
          <Distribution title="Accounts by role" data={toDist(c.users)}/>
          <Distribution title="Listing status" data={toDist(c.properties)}/>
        </div>
      </section>
    }

    <section className="admin-section">
      <div className="admin-section-head"><h2>Moderation & access monitoring</h2><Link to="/admin/audit">Full audit log</Link></div>
      <div className="admin-grid-2">
        <Distribution title="Verification queue" data={toDist(trends.data?.verificationStatuses)}/>
        <Distribution title="Subscriptions" data={toDist(c.subscriptions)}/>
      </div>
      {audit.isPending ? <p>Loading recent audit activity…</p> : audit.isError ? <p role="alert">{(audit.error as Error).message}</p> :
        <AdminAuditTimeline items={(audit.data ?? []).slice(0, 8).map(a => ({ at: a.at, by: a.actor, text: `${a.action} · ${a.entityType}` }))} empty="No platform audit activity recorded yet."/>}
    </section>

    <p className="form-hint">This dashboard uses the existing PostgreSQL-backed admin modules. No demo counts are introduced here; unavailable traffic/page-view metrics remain excluded.</p>
  </main>;
}

function OwnerAction({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return <Link to={href} className="admin-section" style={{ textDecoration: "none", display: "block" }}>
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <span aria-hidden="true">{icon}</span>
      <div><strong>{title}</strong><p className="form-hint">{text}</p></div>
    </div>
  </Link>;
}
