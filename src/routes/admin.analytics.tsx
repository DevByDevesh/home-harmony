import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LocalEventsCard } from "@/components/analytics-kit";
import { AdminChartCard, AdminHeader, AdminMetricCard, Distribution } from "@/components/admin/admin-kit";
import { LiveCountsPanel } from "@/components/admin/live-business";
import { adminTrendsFn, liveCountsFn } from "@/lib/admin-business.functions";
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
const chartKeys = ["New accounts", "New listings", "Visit requests", "Enquiries", "Payments", "Service requests"];

function AdminAnalytics() {
  const [period, setPeriod] = useState<keyof typeof periods>("30 days"); const [gran, setGran] = useState<Gran>("Daily");
  const days = periods[period];
  const trends = useQuery({ queryKey: ["admin", "trends", days], queryFn: () => adminTrendsFn({ data: { days } }) });
  const counts = useQuery({ queryKey: ["admin", "counts"], queryFn: () => liveCountsFn() });
  const series = useMemo(() => trends.data ? Object.entries(trends.data.series).map(([name, data]) => ({ name, data: group(data, gran) })) : [], [trends.data, gran]);
  const t = (n: string) => total(trends.data?.series[n] ?? []);
  return <>
    <AdminHeader title="Analytics" intro="Real counts and creation-date trends from the database. No traffic or market statistics — page views and searches aren’t collected server-side."/>
    <LiveCountsPanel/>
    <div className="admin-filters"><label className="admin-select"><span>Period</span><select value={period} onChange={e => setPeriod(e.target.value as keyof typeof periods)}>{Object.keys(periods).map(p => <option key={p}>{p}</option>)}</select></label>
      <div className="seg-tabs" role="tablist" aria-label="Granularity">{(["Daily", "Weekly", "Monthly"] as Gran[]).map(g => <button key={g} role="tab" aria-selected={gran === g} onClick={() => setGran(g)}>{g}</button>)}</div></div>
    {trends.isPending ? <p>Loading…</p> : trends.isError ? <p role="alert">{(trends.error as Error).message}</p> : <>
      <AdminMetricCard items={series.slice(0, 9).map(x => { const half = Math.floor(x.data.length / 2); const a = total(x.data.slice(0, half)), b = total(x.data.slice(half)); return { label: x.name, value: total(x.data), hint: a ? `${b >= a ? "+" : ""}${Math.round(((b - a) / a) * 100)}% vs first half` : undefined }; })}/>
      <div className="admin-grid-2">
        {series.filter(x => chartKeys.includes(x.name)).map(x => <AdminChartCard key={`${x.name}-${days}-${gran}`} title={x.name} data={x.data} kind={gran === "Daily" ? "area" : "bar"}/>)}
        <Distribution title={`Actions in the last ${days} days`} data={[{ label: "Saved searches", value: t("Saved searches") }, { label: "Saved properties", value: t("Saved properties") }, { label: "Comparisons", value: t("Comparisons") }, { label: "Visit requests", value: t("Visit requests") }, { label: "Enquiries", value: t("Enquiries") }]}/>
        <Distribution title="Listing status (live)" data={toDist(counts.data?.properties)}/>
        <Distribution title="Verification checks (live)" data={toDist(trends.data.verificationStatuses)}/>
        <Distribution title="Subscriptions (live)" data={toDist(counts.data?.subscriptions)}/>
        <Distribution title="Service requests (live)" data={toDist(counts.data?.requests)}/>
      </div>
    </>}
    <p className="form-hint">Payment processing is not connected. Analytics below reflect recorded HouseProvider activity.</p>
    <LocalEventsCard types={["PROPERTY_VIEW", "PROPERTY_SAVE", "PROPERTY_COMPARE", "SEARCH", "VISIT_REQUEST", "LISTING_PUBLISHED"]}/>
  </>;
}




