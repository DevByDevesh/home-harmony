import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminDataTable, AdminDemoNote, AdminDetailPanel, AdminHeader, AdminStatusBadge, DetailList, fmtDate, type RowAction } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";
import type { ServiceProvider, ServiceRequest, ServiceRequestStatus } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/services")({ head: adminHead("Services"), component: AdminServices });
const tabs = ["Providers", "Requests & bookings", "Categories"] as const;
const reqStatuses: ServiceRequestStatus[] = ["NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function AdminServices() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Providers");
  const [ask, dialog] = useConfirm(); const [open, setOpen] = useState<string | null>(null); const [req, setReq] = useState<string | null>(null);
  const setProv = (p: ServiceProvider, status: ServiceProvider["status"], action: string) => act.update("providers", p.id, { status }, action, p.business, "services.manage");
  const provActions = (p: ServiceProvider): RowAction[] => [
    { label: "Approve", hidden: p.status !== "PENDING", onSelect: () => setProv(p, "ACTIVE", "Service provider approved") },
    { label: "Reject", hidden: p.status !== "PENDING", destructive: true, onSelect: () => ask({ title: `Reject ${p.business}?`, description: "The provider can reapply later.", confirm: "Reject", onConfirm: () => setProv(p, "REJECTED", "Service provider rejected") }) },
    { label: "Suspend", hidden: p.status !== "ACTIVE", destructive: true, onSelect: () => ask({ title: `Suspend ${p.business}?`, description: "They stop receiving new requests.", confirm: "Suspend", onConfirm: () => setProv(p, "SUSPENDED", "Service provider suspended") }) },
    { label: "Restore", hidden: p.status !== "SUSPENDED" && p.status !== "REJECTED", onSelect: () => setProv(p, "ACTIVE", "Service provider restored") },
  ];
  const cur = s.providers.find(p => p.id === open); const r = s.serviceRequests.find(x => x.id === req);
  const setReqPatch = (x: ServiceRequest, patch: Partial<ServiceRequest>, action: string) => act.update("serviceRequests", x.id, patch, action, `Service request ${x.id}`, "services.manage");
  return <>
    <AdminHeader title="Services marketplace" intro="Foundation for moving, cleaning, legal and other home services. No real providers are onboarded yet."/>
    <AdminDemoNote>All providers are fictional. Ratings shown are demo placeholders, not customer reviews.</AdminDemoNote>
    <div className="seg-tabs" role="tablist" aria-label="Services sections">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === "Providers" && <AdminDataTable rows={s.providers} ready={ready} caption="Service providers" emptyTitle="No service providers match these filters." rowLabel={p => p.business} onOpen={p => setOpen(p.id)} actions={provActions}
      search={p => `${p.name} ${p.business} ${p.city}`}
      filters={[{ key: "status", label: "Status", options: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"], get: p => p.status }, { key: "cat", label: "Category", options: s.categories.map(c => c.name), get: p => l.category(p.categoryId)?.name ?? "" }]}
      columns={[
        { key: "business", label: "Provider", render: p => <span className="admin-cell-main"><strong>{p.business}</strong><small>{p.name}</small></span>, sort: p => p.business },
        { key: "cat", label: "Category", render: p => l.category(p.categoryId)?.name },
        { key: "city", label: "Location", render: p => p.city, sort: p => p.city },
        { key: "rating", label: "Rating", render: p => p.demoRating ? `${p.demoRating.toFixed(1)} (demo)` : "No ratings" },
        { key: "status", label: "Status", render: p => <AdminStatusBadge status={p.status}/>, sort: p => p.status },
      ]}/>}
    {tab === "Requests & bookings" && <AdminDataTable rows={s.serviceRequests} ready={ready} caption="Service requests" emptyTitle="No service requests yet." rowLabel={x => `Request ${x.id}`} onOpen={x => setReq(x.id)}
      search={x => `${l.userName(x.userId)} ${l.category(x.categoryId)?.name} ${x.city}`}
      filters={[{ key: "status", label: "Status", options: reqStatuses, get: x => x.status }]}
      columns={[
        { key: "id", label: "Request", render: x => <span className="admin-cell-main"><strong>{l.category(x.categoryId)?.name}</strong><small>{x.id} · {x.city}</small></span> },
        { key: "user", label: "Customer", render: x => l.userName(x.userId) },
        { key: "provider", label: "Provider", render: x => s.providers.find(p => p.id === x.providerId)?.business ?? "Unassigned" },
        { key: "booking", label: "Booking", render: x => x.scheduledFor ? fmtDate(x.scheduledFor) : "Not booked" },
        { key: "status", label: "Status", render: x => <AdminStatusBadge status={x.status}/>, sort: x => reqStatuses.indexOf(x.status) },
      ]}/>}
    {tab === "Categories" && <ul className="admin-categories">{s.categories.map(c => <li key={c.id}><div><strong>{c.name}</strong><small>{s.providers.filter(p => p.categoryId === c.id).length} providers · commission {c.commissionPct}% (configurable)</small></div>
      <label className="admin-inline-num"><span className="sr-only">Commission for {c.name}</span><input type="number" min={0} max={50} defaultValue={c.commissionPct} onBlur={e => { const v = Number(e.target.value); if (v !== c.commissionPct && v >= 0 && v <= 50) act.saveCategory({ ...c, commissionPct: v }); }}/>%</label>
      <label className="admin-check"><Switch checked={c.enabled} onCheckedChange={v => act.saveCategory({ ...c, enabled: v })} aria-label={`${c.name} enabled`}/> {c.enabled ? "Enabled" : "Disabled"}</label></li>)}</ul>}
    {cur && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={cur.business} description="Fictional provider.">
      <DetailList items={[["Contact person", cur.name], ["Category", l.category(cur.categoryId)?.name], ["Location", cur.city], ["Contact", cur.contact], ["Verification", <AdminStatusBadge key="v" status={cur.verification}/>], ["Rating", cur.demoRating ? `${cur.demoRating.toFixed(1)} — demo placeholder` : "No ratings"], ["Status", <AdminStatusBadge key="s" status={cur.status}/>], ["Services", cur.services.join(", ")], ["Pricing model", cur.pricingModel.toLowerCase()]]}/>
      <p className="form-hint">Reviews, quotes, availability, service areas and documents will attach here once the backend exists.</p>
      <div className="admin-sheet-actions">{provActions(cur).filter(a => !a.hidden).map(a => <Button key={a.label} size="sm" variant={a.destructive ? "outline" : "default"} onClick={a.onSelect}>{a.label}</Button>)}</div>
    </AdminDetailPanel>}
    {r && <AdminDetailPanel open onOpenChange={o => !o && setReq(null)} title={`Service request ${r.id}`}>
      <DetailList items={[["Customer", l.userName(r.userId)], ["Category", l.category(r.categoryId)?.name], ["City", r.city], ["Requested", fmtDate(r.createdAt)], ["Booking", r.scheduledFor ? fmtDate(r.scheduledFor) : "Not booked"]]}/>
      <label className="admin-field"><span>Assign provider</span><select value={r.providerId ?? ""} onChange={e => e.target.value && setReqPatch(r, { providerId: e.target.value, status: r.status === "NEW" ? "ASSIGNED" : r.status }, "Provider assigned")}>
        <option value="">Select an active provider</option>{s.providers.filter(p => p.status === "ACTIVE" && p.categoryId === r.categoryId).map(p => <option key={p.id} value={p.id}>{p.business}</option>)}</select>
        {!s.providers.some(p => p.status === "ACTIVE" && p.categoryId === r.categoryId) && <small>No active provider in this category.</small>}</label>
      <label className="admin-field"><span>Status</span><select value={r.status} onChange={e => setReqPatch(r, { status: e.target.value as ServiceRequestStatus }, `Service request ${e.target.value.toLowerCase().replace("_", " ")}`)}>{reqStatuses.map(x => <option key={x} value={x}>{x.replace("_", " ").toLowerCase()}</option>)}</select></label>
    </AdminDetailPanel>}
    {dialog}
  </>;
}
