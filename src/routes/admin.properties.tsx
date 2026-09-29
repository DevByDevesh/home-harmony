import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminDataTable, AdminDemoNote, AdminDetailPanel, AdminHeader, AdminStatusBadge, DetailList, fmtDate, type RowAction } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";
import { LivePropertiesPanel } from "@/components/admin/live-records";
import { inr } from "@/lib/catalog";
import type { AdminProperty } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/properties")({ head: adminHead("Properties"), component: AdminProperties });
const statuses = ["ACTIVE", "UNDER_REVIEW", "PAUSED", "RENTED", "SOLD", "EXPIRED", "ARCHIVED"];
const today = () => new Date().toISOString().slice(0, 10);
const plus = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

function AdminProperties() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [ask, dialog] = useConfirm(); const [open, setOpen] = useState<string | null>(null);
  const set = (p: AdminProperty, patch: Partial<AdminProperty>, action: string) => act.update("properties", p.id, { ...patch, updatedAt: new Date().toISOString() }, action, p.title, "listings.moderate");
  const actions = (p: AdminProperty): RowAction[] => [
    { label: "Approve", hidden: p.status !== "UNDER_REVIEW", onSelect: () => set(p, { status: "ACTIVE", changesRequested: undefined }, "Property approved") },
    { label: "Request changes", hidden: p.status !== "UNDER_REVIEW", onSelect: () => set(p, { changesRequested: "Please confirm the carpet area and add a clearer cover photo." }, "Changes requested") },
    { label: "Reject", hidden: p.status !== "UNDER_REVIEW", destructive: true, onSelect: () => ask({ title: `Reject “${p.title}”?`, description: "The listing is archived with a rejection note. The owner can edit and resubmit.", confirm: "Reject", onConfirm: () => set(p, { status: "ARCHIVED", changesRequested: "Rejected by moderation" }, "Property rejected") }) },
    { label: "Pause", hidden: p.status !== "ACTIVE", onSelect: () => set(p, { status: "PAUSED" }, "Listing paused") },
    { label: "Resume", hidden: p.status !== "PAUSED", onSelect: () => set(p, { status: "ACTIVE" }, "Listing resumed") },
    { label: "Mark featured", hidden: p.featured || p.status !== "ACTIVE", onSelect: () => act.setFeatured(p.id, { startsAt: today(), endsAt: plus(s.settings.featured.maxDurationDays) }, p.title) },
    { label: "Remove featured", hidden: !p.featured, onSelect: () => act.setFeatured(p.id, null, p.title) },
    { label: "Archive", hidden: p.status === "ARCHIVED", destructive: true, onSelect: () => ask({ title: `Archive “${p.title}”?`, description: "Archived listings are hidden from seekers but kept for records.", confirm: "Archive", onConfirm: () => set(p, { status: "ARCHIVED", featured: false }, "Listing archived") }) },
    { label: "Restore", hidden: p.status !== "ARCHIVED", onSelect: () => set(p, { status: "UNDER_REVIEW" }, "Listing restored to review") },
  ];
  const cur = s.properties.find(p => p.id === open); const feat = cur && s.featured.find(f => f.propertyId === cur.id);
  return <>
    <AdminHeader title="Properties" intro="Moderate listings. Approval makes a listing visible — it does not make it verified."/>
    <LivePropertiesPanel/>
    <AdminDemoNote>Fictional catalog listings. Approving here doesn't change the public demo pages.</AdminDemoNote>
    <AdminDataTable rows={s.properties} ready={ready} caption="Properties" emptyTitle="No properties found." rowLabel={p => p.title} onOpen={p => setOpen(p.id)} actions={actions}
      search={p => `${p.title} ${p.locality} ${p.city} ${l.userName(p.ownerId)} ${l.userName(p.agentId)} ${p.id}`}
      filters={[{ key: "status", label: "Status", options: statuses, get: p => p.status }, { key: "flags", label: "Flag", options: ["REPORTED", "FEATURED"], get: p => p.featured ? "FEATURED" : p.reports ? "REPORTED" : "" }]}
      columns={[
        { key: "title", label: "Property", render: p => <span className="admin-cell-main"><strong>{p.title}</strong><small>{p.id} · {p.locality}, {p.city}</small></span>, sort: p => p.title },
        { key: "price", label: "Price", render: p => `${inr(p.price)}${p.mode === "Rent" ? "/mo" : ""}`, sort: p => p.price },
        { key: "owner", label: "Owner / agent", render: p => `${l.userName(p.ownerId)}${p.agentId ? ` · ${l.userName(p.agentId)}` : ""}` },
        { key: "status", label: "Listing status", render: p => <AdminStatusBadge status={p.status}/>, sort: p => p.status },
        { key: "verification", label: "Verification", render: p => <AdminStatusBadge status={p.verification}/> },
        { key: "flags", label: "Flags", render: p => <span className="admin-flags">{p.featured && <span className="admin-tag">Featured</span>}{p.reports > 0 && <span className="admin-tag admin-tag-warn">{p.reports} report{p.reports > 1 ? "s" : ""}</span>}{!p.featured && !p.reports && "—"}</span> },
        { key: "updated", label: "Updated", render: p => fmtDate(p.updatedAt), sort: p => p.updatedAt },
      ]}/>
    <section className="admin-section"><h2>Featured placements</h2><p className="form-hint">Featured is a paid/promotional placement only. It never means verified, safer, better or a higher match.</p>
      {s.featured.length ? <ul className="admin-mini-list">{s.featured.map(f => <li key={f.id}><span>{l.propertyTitle(f.propertyId)}</span><small>{fmtDate(f.startsAt)} – {fmtDate(f.endsAt)} · by {f.createdBy}</small></li>)}</ul> : <p className="form-hint">No featured listings.</p>}</section>
    {cur && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={cur.title} description="Fictional demo listing.">
      <DetailList items={[["ID", cur.id], ["Location", `${cur.locality}, ${cur.city}`], ["Price", inr(cur.price)], ["Owner", l.userName(cur.ownerId)], ["Agent", l.userName(cur.agentId)], ["Listing status", <AdminStatusBadge key="s" status={cur.status}/>], ["Verification", <AdminStatusBadge key="v" status={cur.verification}/>], ["Reports", cur.reports], ["Moderation note", cur.changesRequested ?? "—"]]}/>
      {cur.featured && feat && <FeaturedDates key={feat.id} start={feat.startsAt} end={feat.endsAt} max={s.settings.featured.maxDurationDays} onSave={(a, b) => act.setFeatured(cur.id, { startsAt: a, endsAt: b }, cur.title)}/>}
      <div className="admin-sheet-actions">{actions(cur).filter(a => !a.hidden).map(a => <Button key={a.label} size="sm" variant={a.destructive ? "outline" : "default"} onClick={a.onSelect}>{a.label}</Button>)}<Button asChild size="sm" variant="ghost"><Link to="/property/$slug" params={{ slug: cur.slug }}>Open public page</Link></Button></div>
    </AdminDetailPanel>}
    {dialog}
  </>;
}

function FeaturedDates({ start, end, max, onSave }: { start: string; end: string; max: number; onSave: (a: string, b: string) => void }) {
  const [a, setA] = useState(start); const [b, setB] = useState(end);
  const days = (Date.parse(b) - Date.parse(a)) / 864e5; const err = days < 1 ? "End date must be after the start date." : days > max ? `Maximum placement is ${max} days (settings).` : "";
  return <form className="admin-inline-form" onSubmit={e => { e.preventDefault(); if (!err) onSave(a, b); }}>
    <label className="admin-field"><span>Featured from</span><input type="date" value={a} onChange={e => setA(e.target.value)}/></label>
    <label className="admin-field"><span>Until</span><input type="date" value={b} onChange={e => setB(e.target.value)}/></label>
    {err && <p className="admin-field-error" role="alert">{err}</p>}<Button size="sm" type="submit" disabled={!!err}>Save dates</Button></form>;
}
