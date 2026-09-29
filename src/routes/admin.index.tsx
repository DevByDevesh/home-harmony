import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminAuditTimeline, AdminChartCard, AdminDemoNote, AdminHeader, AdminLoadingState, AdminMetricCard, Distribution, count } from "@/components/admin/admin-kit";
import { useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";
import { demoSeries } from "@/lib/analytics";
import { inr } from "@/lib/catalog";

export const Route = createFileRoute("/admin/")({ head: adminHead("Overview"), component: AdminOverview });

function AdminOverview() {
  const { data: s, ready } = useAdminData();
  if (!ready) return <><AdminHeader title="Operations overview" intro="Loading…"/><AdminLoadingState/></>;
  const revenue = s.payments.filter(p => p.status === "SUCCEEDED").reduce((n, p) => n + p.amount, 0);
  return <>
    <AdminHeader title="Operations overview" intro="What needs attention across listings, trust and revenue."/>
    <AdminDemoNote>All numbers come from fictional demo records on this device — not real platform statistics.</AdminDemoNote>
    <AdminMetricCard items={[
      { label: "Total users", value: s.users.length }, { label: "Active owners", value: s.users.filter(u => u.role === "OWNER" && u.status === "ACTIVE").length },
      { label: "Active agents", value: s.users.filter(u => u.role === "AGENT" && u.status === "ACTIVE").length }, { label: "Active listings", value: s.properties.filter(p => p.status === "ACTIVE").length },
      { label: "Listings under review", value: s.properties.filter(p => p.status === "UNDER_REVIEW").length }, { label: "Pending verifications", value: s.verifications.filter(v => v.status === "PENDING" || v.status === "IN_REVIEW").length },
      { label: "Open reports", value: s.reports.filter(r => r.status === "OPEN" || r.status === "IN_REVIEW").length }, { label: "Pending enquiries", value: s.enquiries.filter(e => e.status === "NEW").length },
      { label: "Upcoming visits", value: s.visits.filter(v => v.status === "REQUESTED" || v.status === "CONFIRMED" || v.status === "RESCHEDULED").length },
      { label: "Revenue (demo)", value: inr(revenue), hint: "Succeeded demo transactions" }, { label: "Active subscriptions", value: s.subscriptions.filter(x => x.status === "ACTIVE" || x.status === "TRIAL").length },
    ]}/>
    <div className="admin-grid-2">
      <AdminChartCard title="User growth (illustrative)" data={demoSeries(11, 14, 4, 6)}/>
      <AdminChartCard title="Listing growth (illustrative)" data={demoSeries(17, 14, 2, 4)} kind="bar"/>
      <AdminChartCard title="Verification activity (illustrative)" data={demoSeries(23, 14, 1, 5)} kind="bar"/>
      <AdminChartCard title="Revenue overview (illustrative, ₹)" data={demoSeries(31, 14, 900, 2400)}/>
      <Distribution title="Subscription distribution" data={s.plans.map(p => ({ label: p.name, value: s.subscriptions.filter(x => x.planId === p.id).length }))}/>
      <Distribution title="Property status" data={count(s.properties, p => p.status, ["ACTIVE", "UNDER_REVIEW", "PAUSED", "RENTED", "SOLD", "EXPIRED", "ARCHIVED"])}/>
    </div>
    <section className="admin-section"><div className="admin-section-head"><h2>Recent activity</h2><Link to="/admin/audit">Full audit log</Link></div>
      <AdminAuditTimeline items={s.audit.slice(0, 6).map(a => ({ at: a.at, by: a.admin, text: `${a.action} · ${a.target}` }))}/></section>
  </>;
}
