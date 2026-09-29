import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LocalEventsCard } from "@/components/analytics-kit";
import { AdminChartCard, AdminDemoNote, AdminHeader, AdminMetricCard, Distribution, count } from "@/components/admin/admin-kit";
import { useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";
import { demoSeries, total, type SeriesPoint } from "@/lib/analytics";

export const Route = createFileRoute("/admin/analytics")({ head: adminHead("Analytics"), component: AdminAnalytics });
const periods = { "7 days": 7, "30 days": 30, "90 days": 90 } as const;
type Gran = "Daily" | "Weekly" | "Monthly";
function group(points: SeriesPoint[], g: Gran): SeriesPoint[] {
  const size = g === "Daily" ? 1 : g === "Weekly" ? 7 : 30; if (size === 1) return points;
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points.length; i += size) { const chunk = points.slice(i, i + size); out.push({ label: chunk[0]!.label, value: total(chunk) }); }
  return out;
}
const metrics: [string, number, number, number][] = [["Users", 3, 4, 5], ["Listings", 5, 2, 3], ["Searches", 7, 60, 40], ["Saved properties", 9, 20, 18], ["Saved searches", 13, 5, 6], ["Comparisons", 15, 10, 12], ["Visit requests", 19, 4, 5], ["Listings submitted", 21, 2, 3], ["Verifications", 25, 1, 4], ["Reports", 27, 0, 2], ["Subscriptions", 29, 1, 2], ["Payments", 33, 2, 3], ["Service requests", 35, 1, 3]];

function AdminAnalytics() {
  const { data: s } = useAdminData();
  const [period, setPeriod] = useState<keyof typeof periods>("30 days"); const [gran, setGran] = useState<Gran>("Daily");
  const days = periods[period];
  const series = useMemo(() => metrics.map(([name, seed, base, spread]) => ({ name, data: group(demoSeries(seed, days, base, spread), gran) })), [days, gran]);
  const t = (n: string) => total(series.find(x => x.name === n)!.data);
  const funnel = [["Searches", t("Searches")], ["Saved properties", t("Saved properties")], ["Comparisons", t("Comparisons")], ["Visit requests", t("Visit requests")]] as [string, number][];
  return <>
    <AdminHeader title="Analytics" intro="Operational trends. Server-side event collection is not connected, so series are illustrative."/>
    <AdminDemoNote>Illustrative series generated for demo — not real platform performance.</AdminDemoNote>
    <div className="admin-filters"><label className="admin-select"><span>Period</span><select value={period} onChange={e => setPeriod(e.target.value as keyof typeof periods)}>{Object.keys(periods).map(p => <option key={p}>{p}</option>)}</select></label>
      <div className="seg-tabs" role="tablist" aria-label="Granularity">{(["Daily", "Weekly", "Monthly"] as Gran[]).map(g => <button key={g} role="tab" aria-selected={gran === g} onClick={() => setGran(g)}>{g}</button>)}</div></div>
    <AdminMetricCard items={series.slice(0, 9).map(x => { const half = Math.floor(x.data.length / 2); const a = total(x.data.slice(0, half)), b = total(x.data.slice(half)); return { label: x.name, value: total(x.data), hint: a ? `${b >= a ? "+" : ""}${Math.round(((b - a) / a) * 100)}% vs first half` : undefined }; })}/>
    <div className="admin-grid-2">
      {series.filter(x => ["Users", "Listings", "Searches", "Visit requests", "Payments", "Service requests"].includes(x.name)).map(x => <AdminChartCard key={`${x.name}-${days}-${gran}`} title={`${x.name} (illustrative)`} data={x.data} kind={gran === "Daily" ? "area" : "bar"}/>)}
      <Distribution title="Conversion funnel (illustrative)" data={funnel.map(([label, value]) => ({ label, value }))}/>
      <Distribution title="Listing lifecycle (demo records)" data={count(s.properties, p => p.status, ["UNDER_REVIEW", "ACTIVE", "PAUSED", "RENTED", "SOLD", "EXPIRED", "ARCHIVED"])}/>
      <Distribution title="Verification funnel (demo records)" data={count(s.verifications, v => v.status, ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "EXPIRED"])}/>
      <Distribution title="Subscription overview (demo records)" data={count(s.subscriptions, x => x.status, ["TRIAL", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED"])}/>
      <Distribution title="Services marketplace (demo records)" data={count(s.serviceRequests, x => x.status, ["NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])}/>
    </div>
    <LocalEventsCard types={["PROPERTY_VIEW", "PROPERTY_SAVE", "PROPERTY_COMPARE", "SEARCH", "VISIT_REQUEST", "LISTING_PUBLISHED"]}/>
  </>;
}
