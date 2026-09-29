import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdminAuditTimeline, AdminDataTable, AdminDemoNote, AdminDetailPanel, AdminHeader, AdminStatusBadge, DetailList, NoteForm, fmtDate, notesToTimeline } from "@/components/admin/admin-kit";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { adminHead } from "@/lib/admin/head";
import type { Enquiry, EnquiryStatus } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/enquiries")({ head: adminHead("Enquiries"), component: AdminEnquiries });
const statuses: EnquiryStatus[] = ["NEW", "CONTACTED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function AdminEnquiries() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [open, setOpen] = useState<string | null>(null);
  const name = (e: Enquiry) => `Enquiry ${e.id}`;
  const setStatus = (e: Enquiry, status: EnquiryStatus) => act.update("enquiries", e.id, { status, lastActivityAt: new Date().toISOString() }, `Enquiry marked ${status.toLowerCase().replace("_", " ")}`, name(e), "enquiries.manage");
  const cur = s.enquiries.find(e => e.id === open); const prop = cur && l.property(cur.propertyId);
  return <>
    <AdminHeader title="Enquiries" intro="Operational view of seeker enquiries. Message content will appear once messaging exists."/>
    <AdminDemoNote>Fictional enquiries. No real messages are stored or shown.</AdminDemoNote>
    <AdminDataTable rows={s.enquiries} ready={ready} caption="Enquiries" emptyTitle="No enquiries found." rowLabel={name} onOpen={e => setOpen(e.id)}
      actions={e => [...statuses.filter(x => x !== e.status).map(x => ({ label: `Mark ${x.toLowerCase().replace("_", " ")}`, onSelect: () => setStatus(e, x) })), { label: "Assign to me", hidden: e.assignee === act.who, onSelect: () => act.update("enquiries", e.id, { assignee: act.who }, "Enquiry assigned", name(e), "enquiries.manage") }]}
      search={e => `${l.userName(e.userId)} ${l.propertyTitle(e.propertyId)} ${l.userName(e.handlerId)}`}
      filters={[{ key: "status", label: "Status", options: statuses, get: e => e.status }]}
      columns={[
        { key: "user", label: "Seeker", render: e => l.userName(e.userId), sort: e => l.userName(e.userId) },
        { key: "property", label: "Property", render: e => l.propertyTitle(e.propertyId) },
        { key: "handler", label: "Owner / agent", render: e => l.userName(e.handlerId) },
        { key: "date", label: "Date", render: e => fmtDate(e.createdAt), sort: e => e.createdAt },
        { key: "status", label: "Status", render: e => <AdminStatusBadge status={e.status}/>, sort: e => statuses.indexOf(e.status) },
        { key: "last", label: "Last activity", render: e => fmtDate(e.lastActivityAt), sort: e => e.lastActivityAt },
      ]}/>
    {cur && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={name(cur)}>
      <DetailList items={[["Seeker", l.userName(cur.userId)], ["Property", prop ? <Link key="p" to="/property/$slug" params={{ slug: prop.slug }}>{prop.title}</Link> : "—"], ["Owner / agent", l.userName(cur.handlerId)], ["Assigned", cur.assignee ?? "Unassigned"], ["Messages", "Messaging not connected yet"]]}/>
      <label className="admin-field"><span>Status</span><select value={cur.status} onChange={e => setStatus(cur, e.target.value as EnquiryStatus)}>{statuses.map(x => <option key={x} value={x}>{x.replace("_", " ").toLowerCase()}</option>)}</select></label>
      <NoteForm onAdd={t => act.addNote("enquiries", cur.id, t, name(cur))}/><h3>Internal notes</h3><AdminAuditTimeline items={notesToTimeline(cur.notes)} empty="No notes yet."/>
    </AdminDetailPanel>}
  </>;
}
