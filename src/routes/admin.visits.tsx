import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminDataTable, AdminDemoNote, AdminDetailPanel, AdminHeader, AdminStatusBadge, DetailList, fmtDate } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";
import { LiveVisitsPanel } from "@/components/admin/live-records";
import { visitTransitions, statusLabel, type VisitStatus } from "@/lib/visits";
import type { AdminVisit } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/visits")({ head: adminHead("Visits"), component: AdminVisits });
const verbs: Record<VisitStatus, string> = { CONFIRMED: "Confirm", RESCHEDULED: "Reschedule", CANCELLED: "Cancel", COMPLETED: "Mark completed", REQUESTED: "Request" };

function AdminVisits() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [ask, dialog] = useConfirm(); const [open, setOpen] = useState<string | null>(null);
  const name = (v: AdminVisit) => `Visit ${v.id} · ${l.propertyTitle(v.propertyId)}`;
  const move = (v: AdminVisit, to: VisitStatus) => {
    const go = () => act.update("visits", v.id, { status: to }, `Visit ${statusLabel[to].toLowerCase()}`, name(v), "visits.manage");
    if (to === "CANCELLED") ask({ title: "Cancel this visit?", description: "Nobody is notified in demo mode.", confirm: "Cancel visit", onConfirm: go }); else go();
  };
  const actions = (v: AdminVisit) => visitTransitions[v.status].map(to => ({ label: verbs[to], destructive: to === "CANCELLED", onSelect: () => move(v, to) }));
  const cur = s.visits.find(v => v.id === open);
  return <>
    <AdminHeader title="Visits" intro="Visit requests across the platform, using the same statuses and rules as seekers and owners."/>
    <LiveVisitsPanel/>
    <AdminDemoNote>Fictional visits. Seeker visits you request elsewhere stay on your device and aren't shown here.</AdminDemoNote>
    <AdminDataTable rows={s.visits} ready={ready} caption="Visits" emptyTitle="No visits found." rowLabel={name} onOpen={v => setOpen(v.id)} actions={actions}
      search={v => `${l.propertyTitle(v.propertyId)} ${l.userName(v.userId)} ${l.userName(v.handlerId)}`}
      filters={[{ key: "status", label: "Status", options: Object.keys(statusLabel), get: v => v.status }]}
      columns={[
        { key: "property", label: "Property", render: v => l.propertyTitle(v.propertyId) },
        { key: "user", label: "Visitor", render: v => l.userName(v.userId) },
        { key: "handler", label: "Owner / agent", render: v => l.userName(v.handlerId) },
        { key: "date", label: "Date", render: v => fmtDate(v.date), sort: v => v.date },
        { key: "time", label: "Time", render: v => v.slot },
        { key: "status", label: "Status", render: v => <AdminStatusBadge status={v.status}/>, sort: v => v.status },
      ]}/>
    {cur && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={name(cur)}>
      <DetailList items={[["Visitor", l.userName(cur.userId)], ["Owner / agent", l.userName(cur.handlerId)], ["When", `${fmtDate(cur.date)} · ${cur.slot}`], ["Status", <AdminStatusBadge key="s" status={cur.status}/>]]}/>
      <div className="admin-sheet-actions">{actions(cur).map(a => <Button key={a.label} size="sm" variant={a.destructive ? "outline" : "default"} onClick={a.onSelect}>{a.label}</Button>)}</div>
      {!actions(cur).length && <p className="form-hint">This visit is closed.</p>}
    </AdminDetailPanel>}
    {dialog}
  </>;
}
