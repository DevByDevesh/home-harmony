import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminDataTable, AdminDetailPanel, AdminHeader, AdminStatusBadge, fmtDate, type RowAction } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { LivePlansPanel, LiveSubscriptionsPanel } from "@/components/admin/live-business";
import { adminHead } from "@/lib/admin/head";
import { inr } from "@/lib/catalog";
import type { Subscription, SubscriptionPlan } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/subscriptions")({ head: adminHead("Subscriptions"), component: AdminSubscriptions });

function AdminSubscriptions() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [ask, dialog] = useConfirm(); const [edit, setEdit] = useState<SubscriptionPlan | null>(null);
  const setSub = (x: Subscription, status: Subscription["status"], action: string) => act.update("subscriptions", x.id, { status }, action, `${l.userName(x.userId)} · ${l.plan(x.planId)?.name}`, "subscriptions.manage");
  const actions = (x: Subscription): RowAction[] => [
    { label: "Pause", hidden: x.status !== "ACTIVE" && x.status !== "TRIAL", onSelect: () => setSub(x, "PAUSED", "Subscription paused") },
    { label: "Resume", hidden: x.status !== "PAUSED" && x.status !== "PAST_DUE", onSelect: () => setSub(x, "ACTIVE", "Subscription resumed") },
    { label: "Cancel", hidden: x.status === "CANCELLED" || x.status === "EXPIRED", destructive: true, onSelect: () => ask({ title: "Cancel subscription?", description: "Access continues until the renewal date. No provider is charged or refunded.", confirm: "Cancel subscription", onConfirm: () => setSub(x, "CANCELLED", "Subscription cancelled") }) },
  ];
  return <>
    <AdminHeader title="Subscriptions" intro="Plans are configuration, not hard-coded prices. Plan values can be configured by authorized administrators."/>
    <LivePlansPanel canEdit={act.can("plans.edit")}/>
    <LiveSubscriptionsPanel/>
    <p className="admin-note">Billing is not connected. Plan configuration is stored in HouseProvider.</p>
    <div className="admin-plans">{s.plans.map(p => <article key={p.id} className={`admin-plan ${p.enabled ? "" : "is-off"}`}>
      <header><h3>{p.name}</h3><AdminStatusBadge status={p.enabled ? "ACTIVE" : "SUSPENDED"}/></header>
      <p className="admin-plan-price">{p.monthly ? inr(p.monthly) : "₹0"}<small>/month · {inr(p.annual)}/year</small></p>
      <ul><li>Listings: {p.listingLimit ?? "Unlimited"}</li><li>Featured allowance: {p.featuredAllowance}</li><li>Leads: {p.leadLimit ?? "Unlimited"}</li><li>Team seats: {p.teamSeats}</li><li>Analytics: {p.analytics ? "Included" : "Not included"}</li><li>Services marketplace: {p.marketplace ? "Included" : "Not included"}</li></ul>
      <p className="form-hint">{s.subscriptions.filter(x => x.planId === p.id).length} subscribers</p>
      <div className="admin-plan-actions"><label><Switch checked={p.enabled} disabled={!act.can("plans.edit")} onCheckedChange={v => act.savePlan({ ...p, enabled: v })} aria-label={`${p.name} enabled`}/> Enabled</label><Button size="sm" variant="outline" disabled={!act.can("plans.edit")} onClick={() => setEdit(p)}>Edit</Button></div>
    </article>)}</div>
    {!act.can("plans.edit") && <p className="form-hint">Plan configuration can be changed by a Super admin.</p>}
    <section className="admin-section"><h2>Subscribers</h2>
      <AdminDataTable rows={s.subscriptions} ready={ready} caption="Subscribers" emptyTitle="No subscribers found." rowLabel={x => l.userName(x.userId)} actions={actions}
        search={x => `${l.userName(x.userId)} ${l.plan(x.planId)?.name}`}
        filters={[{ key: "status", label: "Status", options: ["TRIAL", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED"], get: x => x.status }, { key: "plan", label: "Plan", options: s.plans.map(p => p.id), get: x => x.planId }]}
        columns={[
          { key: "user", label: "Subscriber", render: x => l.userName(x.userId), sort: x => l.userName(x.userId) },
          { key: "plan", label: "Plan", render: x => l.plan(x.planId)?.name ?? x.planId },
          { key: "cycle", label: "Billing", render: x => x.cycle.toLowerCase() },
          { key: "status", label: "Status", render: x => <AdminStatusBadge status={x.status}/>, sort: x => x.status },
          { key: "renews", label: "Renewal", render: x => fmtDate(x.renewsAt), sort: x => x.renewsAt },
        ]}/></section>
    {edit && <AdminDetailPanel open onOpenChange={o => !o && setEdit(null)} title={`Edit ${edit.name}`} description="Configuration change is saved in HouseProvider. Billing provider integration is not connected.">
      <PlanForm plan={edit} onSave={p => { if (act.savePlan(p)) setEdit(null); }}/></AdminDetailPanel>}
    {dialog}
  </>;
}

function PlanForm({ plan, onSave }: { plan: SubscriptionPlan; onSave: (p: SubscriptionPlan) => void }) {
  const [p, setP] = useState(plan);
  const num = (k: keyof SubscriptionPlan, label: string, nullable = false) => <label className="admin-field"><span>{label}{nullable && " (blank = unlimited)"}</span>
    <input type="number" min={0} value={(p[k] as number | null) ?? ""} onChange={e => setP({ ...p, [k]: e.target.value === "" ? (nullable ? null : 0) : Math.max(0, Number(e.target.value)) })}/></label>;
  const bool = (k: keyof SubscriptionPlan, label: string) => <label className="admin-check"><Switch checked={p[k] as boolean} onCheckedChange={v => setP({ ...p, [k]: v })}/> {label}</label>;
  return <form className="admin-form" onSubmit={e => { e.preventDefault(); onSave(p); }}>
    <label className="admin-field"><span>Plan name</span><input value={p.name} required onChange={e => setP({ ...p, name: e.target.value })}/></label>
    {num("monthly", "Monthly price (₹)")}{num("annual", "Annual price (₹)")}{num("listingLimit", "Listing limit", true)}{num("featuredAllowance", "Featured allowance")}{num("leadLimit", "Lead limit", true)}{num("teamSeats", "Team seats")}
    {bool("analytics", "Analytics access")}{bool("marketplace", "Services marketplace access")}
    <Button type="submit" disabled={!p.name.trim()}>Save configuration</Button></form>;
}

