import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminChartCard, AdminHeader, AdminMetricCard, Distribution } from "@/components/admin/admin-kit";

import { adminAnalyticsFn } from "@/lib/admin-business.functions";
import { adminHead } from "@/lib/admin/head";
import { total, type SeriesPoint } from "@/lib/analytics";

export const Route = createFileRoute("/admin/analytics")({ head: adminHead("Analytics"), component: AdminAnalytics });
const periods = { "7 days": 7, "30 days": 30, "90 days": 90 } as const;
type Gran = "Daily" | "Weekly" | "Monthly";
function group(points: SeriesPoint[], g: Gran): SeriesPoint[] {
  const size = g === "Daily" ? 1 : g === "Weekly" ? 7 : 30; if (size === 1) return points;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points.length; i += size) { const chunk = points.slice(i, i + size); out.push({ label: chunk[0]!.label, value: total(chunk) }); }
  return out;
}
const lc = (s: string) => s.replaceAll("_", " ").toLowerCase();
const toDist = (o: Record<string, number> | undefined) => o ? Object.entries(o).map(([k, v]) => ({ label: lc(k), value: v })) : [];


function AdminAnalytics() {
  const [period, setPeriod] = useState<keyof typeof periods>("30 days");
  const [gran, setGran] = useState<Gran>("Daily");
  const days = periods[period];
  const analytics = useQuery({ queryKey: ["admin", "scoped-analytics", days], queryFn: () => adminAnalyticsFn({ data: { days } }) });
  const series = useMemo(() => analytics.data ? Object.entries(analytics.data.series).map(([name, data]) => ({ name, data: group(data, gran) })) : [], [analytics.data, gran]);
  if (analytics.isPending) return <><AdminHeader title="Analytics" intro="Permission-scoped operational analytics."/><p>Loading…</p></>;
  if (analytics.isError) return <><AdminHeader title="Analytics" intro="Permission-scoped operational analytics."/><p role="alert">{(analytics.error as Error).message}</p></>;
  const { metrics, scope } = analytics.data;
  const metricItems = [
    ...(scope.listings ? [{ label: "Total listings", value: metrics.totalListings ?? 0 }, { label: "Active listings", value: metrics.activeListings ?? 0 }, { label: "Pending listings", value: metrics.pendingListings ?? 0 }, { label: "Rejected listings", value: metrics.rejectedListings ?? 0 }] : []),
    ...(scope.enquiries ? [{ label: "Total enquiries", value: metrics.totalEnquiries ?? 0 }] : []),
    ...(scope.visits ? [{ label: "Total visits", value: metrics.totalVisits ?? 0 }] : []),
    ...(scope.moderation ? [{ label: "Reports", value: metrics.totalReports ?? 0 }, { label: "Verification checks", value: metrics.totalVerifications ?? 0 }] : []),
    ...(scope.users ? [{ label: "Total users", value: metrics.totalUsers ?? 0 }, { label: "Active users", value: metrics.activeUsers ?? 0 }, { label: "Banned users", value: metrics.bannedUsers ?? 0 }] : []),
    ...(scope.payments ? [{ label: "Succeeded payments", value: metrics.totalPayments ?? 0 }, { label: "Recorded revenue", value: "₹" + (metrics.paidRevenue ?? 0).toLocaleString("en-IN") }] : []),
    ...(scope.subscriptions ? [{ label: "Subscriptions", value: metrics.totalSubscriptions ?? 0 }, { label: "Active subscriptions", value: metrics.activeSubscriptions ?? 0 }] : []),
    ...(scope.services ? [{ label: "Service requests", value: metrics.totalServiceRequests ?? 0 }] : []),
  ];
  return <>
    <AdminHeader title="Analytics" intro="Operational analytics limited to the permissions assigned to this Admin account. Owner-only platform management and Owner analytics are not exposed here."/>
    <div className="admin-filters"><label className="admin-select"><span>Period</span><select value={period} onChange={e => setPeriod(e.target.value as keyof typeof periods)}>{Object.keys(periods).map(p => <option key={p}>{p}</option>)}</select></label>
      <div className="seg-tabs" role="tablist" aria-label="Granularity">{(["Daily", "Weekly", "Monthly"] as Gran[]).map(g => <button key={g} role="tab" aria-selected={gran === g} onClick={() => setGran(g)}>{g}</button>)}</div></div>
    {metricItems.length ? <AdminMetricCard items={metricItems}/> : <p role="status">No operational analytics permissions are assigned to this Admin account.</p>}
    <div className="admin-grid-2">{series.map(x => <AdminChartCard key={`${x.name}-${days}-${gran}`} title={x.name} data={x.data} kind={gran === "Daily" ? "area" : "bar"}/>)}
      {scope.listings ? <Distribution title="Listing status (permission-scoped)" data={[{ label: "Active", value: metrics.activeListings ?? 0 }, { label: "Under review", value: metrics.pendingListings ?? 0 }, { label: "Rejected", value: metrics.rejectedListings ?? 0 }]}/> : null}
      {scope.moderation ? <Distribution title="Moderation activity" data={[{ label: "Reports", value: metrics.totalReports ?? 0 }, { label: "Verification checks", value: metrics.totalVerifications ?? 0 }]}/> : null}
    </div>
  </>;
}




