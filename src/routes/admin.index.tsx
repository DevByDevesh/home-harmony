import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AdminAuditTimeline,
  AdminChartCard,
  AdminHeader,
  AdminLoadingState,
  AdminMetricCard,
  Distribution,
} from "@/components/admin/admin-kit";
import { adminHead } from "@/lib/admin/head";
import { adminTrendsFn, liveCountsFn } from "@/lib/admin-business.functions";
import { adminListAuditFn } from "@/lib/admin-trust.functions";
import { inr } from "@/lib/catalog";

export const Route = createFileRoute("/admin/")({
  head: adminHead("Overview"),
  component: AdminOverview,
});

const sum = (o: Record<string, number> | undefined) =>
  o ? Object.values(o).reduce((a, b) => a + b, 0) : 0;
const lc = (s: string) => s.replaceAll("_", " ").toLowerCase();
const toDist = (o: Record<string, number> | undefined) =>
  o ? Object.entries(o).map(([k, v]) => ({ label: lc(k), value: v })) : [];

function AdminOverview() {
  const counts = useQuery({ queryKey: ["admin", "counts"], queryFn: () => liveCountsFn() });
  const trends = useQuery({
    queryKey: ["admin", "trends", 30],
    queryFn: () => adminTrendsFn({ data: { days: 30 } }),
  });
  const audit = useQuery({ queryKey: ["admin", "audit"], queryFn: () => adminListAuditFn() });
  if (counts.isPending)
    return (
      <>
        <AdminHeader title="Operations overview" intro="Loading…" />
        <AdminLoadingState />
      </>
    );
  if (counts.isError)
    return (
      <>
        <AdminHeader
          title="Operations overview"
          intro="What needs attention across listings, trust and revenue."
        />
        <p role="alert">{(counts.error as Error).message}</p>
      </>
    );
  const c = counts.data!;
  const verPending =
    (trends.data?.verificationStatuses["PENDING"] ?? 0) +
    (trends.data?.verificationStatuses["IN_REVIEW"] ?? 0);
  return (
    <>
      <AdminHeader
        title="Operations overview"
        intro="What needs attention across listings, trust and revenue. All numbers are live database counts."
      />
      <AdminMetricCard
        items={[
          { label: "Accounts", value: sum(c.users) },
          { label: "Owners", value: c.users["OWNER"] ?? 0 },
          { label: "Agents", value: c.users["AGENT"] ?? 0 },
          { label: "Active listings", value: c.properties["ACTIVE"] ?? 0 },
          { label: "Listings under review", value: c.properties["UNDER_REVIEW"] ?? 0 },
          { label: "Verification checks waiting", value: verPending },
          { label: "New enquiries", value: c.enquiries["NEW"] ?? 0 },
          { label: "Visit requests", value: sum(c.visits) },
          {
            label: "Succeeded payments",
            value: c.paidCount,
            hint: `${inr(c.paidTotal)} total (payment provider)`,
          },
          { label: "Subscriptions", value: sum(c.subscriptions) },
        ]}
      />
      {trends.isPending ? (
        <p>Loading…</p>
      ) : trends.isError ? (
        <p role="alert">{(trends.error as Error).message}</p>
      ) : (
        <div className="admin-grid-2">
          <AdminChartCard
            title="New accounts (30 days)"
            data={trends.data.series["New accounts"]!}
          />
          <AdminChartCard
            title="New listings (30 days)"
            data={trends.data.series["New listings"]!}
            kind="bar"
          />
          <Distribution title="Accounts by role" data={toDist(c.users)} />
          <Distribution title="Listing status" data={toDist(c.properties)} />
        </div>
      )}
      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Recent activity</h2>
          <Link to="/admin/audit">Full audit log</Link>
        </div>
        {audit.isPending ? (
          <p>Loading…</p>
        ) : audit.isError ? (
          <p role="alert">{(audit.error as Error).message}</p>
        ) : (
          <AdminAuditTimeline
            items={(audit.data ?? [])
              .slice(0, 6)
              .map((a) => ({ at: a.at, by: a.actor, text: `${a.action} · ${a.entityType}` }))}
          />
        )}
      </section>
    </>
  );
}
