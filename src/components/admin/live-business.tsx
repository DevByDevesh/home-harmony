/** Live admin panels for payments, subscriptions, services and analytics (PostgreSQL). Provider stays DEMO — no money moves. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { inr } from "@/lib/catalog";
import {
  assignPlanFn, assignServiceRequestFn, listPaymentsFn, listPlansFn, listServicesFn, listSubscriptionsFn, liveCountsFn, rejectRefundFn, requestRefundFn,
  saveCategoryFn, savePlanFn, setPaymentStatusFn, setProviderStatusFn, setServiceRequestStatusFn, setSubscriptionFn, type LivePlan,
} from "@/lib/admin-business.functions";

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const lc = (s: string) => s.replace(/_/g, " ").toLowerCase();
type Q = { isPending: boolean; isError: boolean; error: unknown };

function Panel({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return <section className="admin-accounts dash-panel" aria-labelledby={id}><p className="kicker">LIVE RECORDS</p><h2 id={id}>{title}</h2><p className="form-hint">{hint}</p>{children}</section>;
}
function Table({ q, rows, head, children, empty = "No records yet." }: { q: Q; rows?: unknown[] | undefined; head: string[]; children: ReactNode; empty?: string }) {
  if (q.isPending) return <p>Loading…</p>;
  if (q.isError) return <p role="alert">{(q.error as Error).message}</p>;
  if (!rows?.length) return <p>{empty}</p>;
  return <div className="table-scroll"><table className="admin-table"><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function useRun(...keys: string[]) {
  const qc = useQueryClient();
  return async (p: Promise<{ ok: boolean; message?: string }>, msg: string) => {
    let good = false;
    try { const r = await p; if (!r.ok) toast.error(r.message ?? "Action failed"); else { toast.success(msg); good = true; } } catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); }
    await Promise.all(keys.map(k => qc.invalidateQueries({ queryKey: ["admin", k] })));
    return good;
  };
}

// ---------------- Payments ----------------
export function LivePaymentsPanel({ canRefund }: { canRefund: boolean }) {
  const q = useQuery({ queryKey: ["admin", "payments"], queryFn: () => listPaymentsFn() }); const run = useRun("payments");
  return <Panel id="live-pay" title="Payments in the database" hint="Real payment records. The provider is Demo, so nothing here charges or refunds money. A refund request only creates a placeholder record.">
    <Table q={q} rows={q.data} head={["Payment", "User", "Product", "Amount", "Status", "Provider", "Invoice", "Refund", "Date", "Actions"]} empty="No payments recorded yet. None are created until a payment provider is connected.">
      {q.data?.map(p => { const open = p.refunds.find(r => r.status === "REQUESTED"); const last = p.refunds[0];
        return <tr key={p.id}><td><code>{p.id.slice(0, 10)}</code></td><td>{p.user}</td><td>{p.product}</td><td>{inr(p.amount)} {p.currency}</td><td>{lc(p.status)}</td><td>{lc(p.provider)}</td><td>{p.invoice ?? "—"}</td><td>{last ? lc(last.status) : "—"}</td><td>{date(p.createdAt)}</td>
          <td><div className="dash-row-actions">
            {(p.status === "PENDING" || p.status === "PROCESSING") && <>
              <Button size="sm" variant="outline" onClick={() => void run(setPaymentStatusFn({ data: { id: p.id, status: "CANCELLED" } }), "Payment marked cancelled")}>Mark cancelled</Button>
              <Button size="sm" variant="outline" onClick={() => void run(setPaymentStatusFn({ data: { id: p.id, status: "FAILED" } }), "Payment marked failed")}>Mark failed</Button></>}
            {canRefund && p.status === "SUCCEEDED" && !p.refunds.some(r => r.status !== "REJECTED") && <Button size="sm" variant="outline" onClick={() => { if (window.confirm(`Request a refund of ${inr(p.amount)}? No provider is connected — only a placeholder record is created.`)) void run(requestRefundFn({ data: { id: p.id } }), "Refund requested (placeholder)"); }}>Request refund</Button>}
            {canRefund && open && <Button size="sm" variant="outline" onClick={() => void run(rejectRefundFn({ data: { id: open.id } }), "Refund request rejected")}>Reject refund</Button>}
          </div></td></tr>; })}
    </Table>
    {!canRefund && <p className="form-hint">Refunds require a Super admin.</p>}
  </Panel>;
}

// ---------------- Plans & subscriptions ----------------
export function LivePlansPanel({ canEdit }: { canEdit: boolean }) {
  const q = useQuery({ queryKey: ["admin", "plans"], queryFn: () => listPlansFn() }); const run = useRun("plans");
  const [edit, setEdit] = useState<LivePlan | null>(null);
  const save = async (p: LivePlan) => { const { subscribers: _s, slug: _sl, audience: _a, ...rest } = p; if (await run(savePlanFn({ data: rest }), `${p.name} saved`)) setEdit(null); };
  return <Panel id="live-plans" title="Plans in the database" hint="Placeholder prices, stored as configuration. Changing a plan updates no payment provider.">
    <Table q={q} rows={q.data} head={["Plan", "Audience", "Monthly", "Annual", "Listings", "Featured", "Leads", "Seats", "Analytics", "Subscribers", "Enabled", ""]}>
      {q.data?.map(p => <tr key={p.id}><td><strong>{p.name}</strong></td><td>{lc(p.audience)}</td><td>{inr(p.monthlyPrice)}</td><td>{inr(p.annualPrice)}</td><td>{p.listingLimit ?? "Unlimited"}</td><td>{p.featuredAllowance}</td><td>{p.leadLimit ?? "Unlimited"}</td><td>{p.teamSeats}</td><td>{p.analyticsAccess ? "Yes" : "No"}</td><td>{p.subscribers}</td>
        <td><Switch checked={p.active} disabled={!canEdit} aria-label={`${p.name} enabled`} onCheckedChange={v => void save({ ...p, active: v })}/></td>
        <td><Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setEdit(p)}>Edit</Button></td></tr>)}
    </Table>
    {!canEdit && <p className="form-hint">Plan configuration can be changed by a Super admin.</p>}
    {edit && <PlanEditor plan={edit} onCancel={() => setEdit(null)} onSave={p => void save(p)}/>}
  </Panel>;
}
function PlanEditor({ plan, onSave, onCancel }: { plan: LivePlan; onSave: (p: LivePlan) => void; onCancel: () => void }) {
  const [p, setP] = useState(plan);
  const num = (k: "monthlyPrice" | "annualPrice" | "listingLimit" | "featuredAllowance" | "leadLimit" | "teamSeats", label: string, nullable = false) =>
    <label className="admin-field"><span>{label}{nullable && " (blank = unlimited)"}</span><input type="number" min={k === "teamSeats" ? 1 : 0} value={p[k] ?? ""} onChange={e => setP({ ...p, [k]: e.target.value === "" ? (nullable ? null : 0) : Math.max(0, Number(e.target.value)) })}/></label>;
  return <form className="admin-form" aria-label={`Edit ${plan.name}`} onSubmit={e => { e.preventDefault(); onSave(p); }}>
    <label className="admin-field"><span>Plan name</span><input value={p.name} required onChange={e => setP({ ...p, name: e.target.value })}/></label>
    {num("monthlyPrice", "Monthly price (₹)")}{num("annualPrice", "Annual price (₹)")}{num("listingLimit", "Listing limit", true)}{num("featuredAllowance", "Featured allowance")}{num("leadLimit", "Lead limit", true)}{num("teamSeats", "Team seats")}
    <label className="admin-check"><Switch checked={p.analyticsAccess} onCheckedChange={v => setP({ ...p, analyticsAccess: v })}/> Analytics access</label>
    <div className="dash-row-actions"><Button type="submit" disabled={!p.name.trim()}>Save configuration</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
  </form>;
}

export function LiveSubscriptionsPanel() {
  const q = useQuery({ queryKey: ["admin", "subscriptions"], queryFn: () => listSubscriptionsFn() });
  const plans = useQuery({ queryKey: ["admin", "plans"], queryFn: () => listPlansFn() });
  const run = useRun("subscriptions", "plans");
  const [email, setEmail] = useState(""); const [planId, setPlanId] = useState(""); const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const act = (id: string, action: "pause" | "resume" | "cancel", label: string) => void run(setSubscriptionFn({ data: { id, action } }), label);
  return <Panel id="live-subs" title="Subscribers in the database" hint="Real subscription records for users, owners and agents. Starting a plan here begins a Demo trial — nobody is charged.">
    <form className="admin-filters" aria-label="Start a demo trial" onSubmit={async e => { e.preventDefault(); if (await run(assignPlanFn({ data: { email, planId, cycle } }), "Demo trial started")) setEmail(""); }}>
      <label className="admin-field"><span>Account email</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label>
      <label className="admin-select"><span>Plan</span><select required value={planId} onChange={e => setPlanId(e.target.value)}><option value="">Choose…</option>{plans.data?.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="admin-select"><span>Billing</span><select value={cycle} onChange={e => setCycle(e.target.value as "MONTHLY" | "ANNUAL")}><option value="MONTHLY">Monthly</option><option value="ANNUAL">Annual</option></select></label>
      <Button type="submit" size="sm" disabled={!email || !planId}>Start demo trial</Button>
    </form>
    <Table q={q} rows={q.data} head={["Subscriber", "Plan", "Billing", "Status", "Renewal", "Provider", "Actions"]}>
      {q.data?.map(s => <tr key={s.id}><td>{s.user}<br/><small>{s.email}</small></td><td>{s.plan}</td><td>{lc(s.cycle)}</td><td>{lc(s.status)}</td><td>{date(s.renewsAt)}</td><td>{lc(s.provider)}</td>
        <td><div className="dash-row-actions">
          {(s.status === "ACTIVE" || s.status === "TRIAL") && <Button size="sm" variant="outline" onClick={() => act(s.id, "pause", "Subscription paused")}>Pause</Button>}
          {(s.status === "PAUSED" || s.status === "PAST_DUE") && <Button size="sm" variant="outline" onClick={() => act(s.id, "resume", "Subscription resumed")}>Resume</Button>}
          {!["CANCELLED", "EXPIRED"].includes(s.status) && <Button size="sm" variant="outline" onClick={() => { if (window.confirm("Cancel this subscription? No provider is charged or refunded.")) act(s.id, "cancel", "Subscription cancelled"); }}>Cancel</Button>}
        </div></td></tr>)}
    </Table>
  </Panel>;
}

// ---------------- Services ----------------
export function LiveServicesPanel() {
  const q = useQuery({ queryKey: ["admin", "services"], queryFn: () => listServicesFn() }); const run = useRun("services");
  const [when, setWhen] = useState<Record<string, string>>({}); const [pick, setPick] = useState<Record<string, string>>({});
  const d = q.data; const today = new Date().toISOString().slice(0, 10);
  const provActs: Record<string, ["approve" | "reject" | "suspend" | "restore", string][]> = { PENDING: [["approve", "Approve"], ["reject", "Reject"]], ACTIVE: [["suspend", "Suspend"]], SUSPENDED: [["restore", "Restore"]], REJECTED: [["restore", "Restore"]] };
  const reqNext: Record<string, ("IN_PROGRESS" | "COMPLETED" | "CANCELLED")[]> = { NEW: ["CANCELLED"], ASSIGNED: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"] };
  return <Panel id="live-svc" title="Services in the database" hint="Real categories, providers and requests. Assigning a provider creates a booking; no provider is contacted automatically.">
    <h3>Requests & bookings</h3>
    <Table q={q} rows={d?.requests} head={["Requested by", "Category", "City", "Status", "Provider", "Booking", "Assign", "Actions"]} empty="No service requests yet.">
      {d?.requests.map(r => { const opts = d.providers.filter(p => p.status === "ACTIVE" && p.categoryId === r.categoryId); const closed = r.status === "COMPLETED" || r.status === "CANCELLED";
        return <tr key={r.id}><td>{r.user}</td><td>{r.category}</td><td>{r.city}</td><td>{lc(r.status)}</td><td>{r.provider ?? "—"}</td><td>{r.booking ? date(r.booking.scheduledFor) : "—"}</td>
          <td>{closed ? "—" : opts.length ? <div className="dash-row-actions">
            <select aria-label="Provider" value={pick[r.id] ?? r.providerId ?? ""} onChange={e => setPick({ ...pick, [r.id]: e.target.value })}><option value="">Choose…</option>{opts.map(p => <option key={p.id} value={p.id}>{p.business}</option>)}</select>
            <input type="date" aria-label="Booking date" min={today} value={when[r.id] ?? ""} onChange={e => setWhen({ ...when, [r.id]: e.target.value })}/>
            <Button size="sm" variant="outline" disabled={!(pick[r.id] ?? r.providerId) || !when[r.id]} onClick={() => void run(assignServiceRequestFn({ data: { id: r.id, providerId: (pick[r.id] ?? r.providerId)!, scheduledFor: when[r.id]! } }), "Provider assigned")}>Assign</Button>
          </div> : <small>No approved provider in this category</small>}</td>
          <td><div className="dash-row-actions">{(reqNext[r.status] ?? []).map(s => <Button key={s} size="sm" variant="outline" onClick={() => void run(setServiceRequestStatusFn({ data: { id: r.id, status: s } }), `Request ${lc(s)}`)}>{s === "IN_PROGRESS" ? "Start" : s === "COMPLETED" ? "Complete" : "Cancel"}</Button>)}</div></td></tr>; })}
    </Table>
    <h3>Providers</h3>
    <Table q={q} rows={d?.providers} head={["Business", "Contact name", "Category", "City", "Status", "Verification", "Actions"]} empty="No providers in the database yet — the demo providers below are still shown.">
      {d?.providers.map(p => <tr key={p.id}><td><strong>{p.business}</strong></td><td>{p.name}</td><td>{p.category}</td><td>{p.city}</td><td>{lc(p.status)}</td><td>{lc(p.verification)}</td>
        <td><div className="dash-row-actions">{(provActs[p.status] ?? []).map(([a, label]) => <Button key={a} size="sm" variant="outline" onClick={() => void run(setProviderStatusFn({ data: { id: p.id, action: a } }), `${label}: ${p.business}`)}>{label}</Button>)}</div></td></tr>)}
    </Table>
    <h3>Categories</h3>
    <Table q={q} rows={d?.categories} head={["Category", "Providers", "Requests", "Commission %", "Enabled"]}>
      {d?.categories.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.providers}</td><td>{c.requests}</td>
        <td><input type="number" min={0} max={100} step={0.5} aria-label={`${c.name} commission`} defaultValue={c.commissionPct} onBlur={e => { const v = Number(e.target.value); if (v !== c.commissionPct && v >= 0 && v <= 100) void run(saveCategoryFn({ data: { id: c.id, enabled: c.enabled, commissionPct: v } }), `${c.name} commission saved`); }}/></td>
        <td><Switch checked={c.enabled} aria-label={`${c.name} enabled`} onCheckedChange={v => void run(saveCategoryFn({ data: { id: c.id, enabled: v, commissionPct: c.commissionPct } }), `${c.name} ${v ? "enabled" : "disabled"}`)}/></td></tr>)}
    </Table>
  </Panel>;
}

// ---------------- Analytics ----------------
export function LiveCountsPanel() {
  const q = useQuery({ queryKey: ["admin", "counts"], queryFn: () => liveCountsFn() });
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const d = q.data;
  return <Panel id="live-counts" title="Current database counts" hint="Exact counts of records currently stored in the database. Historical trend data is shown only when recorded activity is available.">
    {q.isPending ? <p>Loading…</p> : q.isError ? <p role="alert">{(q.error as Error).message}</p> : d && <>
      <div className="table-scroll"><table className="admin-table"><thead><tr><th>Record</th><th>Total</th><th>Breakdown</th></tr></thead><tbody>
        {([["Accounts", d.users], ["Listings", d.properties], ["Visit requests", d.visits], ["Enquiries", d.enquiries], ["Subscriptions", d.subscriptions], ["Service requests", d.requests]] as [string, Record<string, number>][]).map(([label, o]) =>
          <tr key={label}><th scope="row">{label}</th><td>{sum(o)}</td><td>{Object.entries(o).map(([k, v]) => `${lc(k)}: ${v}`).join(" · ") || "—"}</td></tr>)}
        {([["Saved homes", d.saved], ["Saved searches", d.searches], ["Comparisons", d.comparisons], ["Verification checks", d.verifications], ["Notifications", d.notifications]] as [string, number][]).map(([label, n]) => <tr key={label}><th scope="row">{label}</th><td>{n}</td><td>—</td></tr>)}
        <tr><th scope="row">Succeeded payments</th><td>{d.paidCount}</td><td>{inr(d.paidTotal)} total (demo provider)</td></tr>
      </tbody></table></div></>}
  </Panel>;
}

