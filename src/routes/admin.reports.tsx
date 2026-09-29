import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminAuditTimeline, AdminDataTable, AdminDemoNote, AdminDetailPanel, AdminHeader, AdminStatusBadge, DetailList, NoteForm, fmtDate, notesToTimeline, type RowAction } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { reportCategoryLabel } from "@/lib/admin/config";
import { adminHead } from "@/lib/admin/head";
import type { Report } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/reports")({ head: adminHead("Reports"), component: AdminReports });

function AdminReports() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [ask, dialog] = useConfirm(); const [open, setOpen] = useState<string | null>(null);
  const name = (r: Report) => `Report ${r.id}`;
  const actions = (r: Report): RowAction[] => {
    const closed = r.status === "RESOLVED" || r.status === "DISMISSED";
    return [
      { label: "Assign to me", hidden: closed || r.assignee === act.who, onSelect: () => act.update("reports", r.id, { assignee: act.who, status: "IN_REVIEW" }, "Reviewer assigned", name(r), "reports.moderate") },
      { label: "Contact related user", hidden: closed, onSelect: () => toast("Messaging isn't connected yet", { description: "No message was sent. Demo action — no live backend update." }) },
      { label: "Pause listing", hidden: closed || !r.propertyId || l.property(r.propertyId)?.status !== "ACTIVE", onSelect: () => act.update("properties", r.propertyId!, { status: "PAUSED" }, "Listing paused (report)", l.propertyTitle(r.propertyId), "listings.moderate") },
      { label: "Suspend account", hidden: closed || !r.subjectUserId || l.user(r.subjectUserId)?.status === "SUSPENDED", destructive: true, onSelect: () => ask({ title: `Suspend ${l.userName(r.subjectUserId)}?`, description: "A report alone is not proof of wrongdoing. Suspend only after review.", confirm: "Suspend", onConfirm: () => act.update("users", r.subjectUserId!, { status: "SUSPENDED" }, "User suspended", l.userName(r.subjectUserId), "users.manage") }) },
      { label: "Resolve", hidden: closed, onSelect: () => act.update("reports", r.id, { status: "RESOLVED" }, "Report resolved", name(r), "reports.moderate") },
      { label: "Dismiss", hidden: closed, onSelect: () => act.update("reports", r.id, { status: "DISMISSED" }, "Report dismissed", name(r), "reports.moderate") },
      { label: "Reopen", hidden: !closed, onSelect: () => act.update("reports", r.id, { status: "OPEN" }, "Report reopened", name(r), "reports.moderate") },
    ];
  };
  const openCount = s.reports.filter(r => r.status === "OPEN" || r.status === "IN_REVIEW").length;
  const cur = s.reports.find(r => r.id === open);
  return <>
    <AdminHeader title="Reports & moderation" intro={openCount ? `${openCount} reported item${openCount > 1 ? "s" : ""} under review or action required.` : "No reports require review."}/>
    <AdminDemoNote>Fictional reports. Reported items are under review — a report is not a finding of fraud.</AdminDemoNote>
    <AdminDataTable rows={s.reports} ready={ready} caption="Reports" emptyTitle="No reports require review." rowLabel={name} onOpen={r => setOpen(r.id)} actions={actions}
      search={r => `${r.summary} ${l.userName(r.reporterId)} ${l.userName(r.subjectUserId)} ${l.propertyTitle(r.propertyId)}`}
      filters={[{ key: "status", label: "Status", options: ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"], get: r => r.status }, { key: "priority", label: "Priority", options: ["LOW", "MEDIUM", "HIGH", "URGENT"], get: r => r.priority }, { key: "category", label: "Category", options: Object.keys(reportCategoryLabel), get: r => r.category }]}
      columns={[
        { key: "summary", label: "Report", render: r => <span className="admin-cell-main"><strong>{reportCategoryLabel[r.category]}</strong><small>{r.summary}</small></span> },
        { key: "subject", label: "Related", render: r => l.property(r.propertyId)?.title ?? l.userName(r.subjectUserId) },
        { key: "priority", label: "Priority", render: r => <AdminStatusBadge status={r.priority}/>, sort: r => ["LOW", "MEDIUM", "HIGH", "URGENT"].indexOf(r.priority) },
        { key: "status", label: "Status", render: r => <AdminStatusBadge status={r.status}/>, sort: r => r.status },
        { key: "assignee", label: "Reviewer", render: r => r.assignee ?? "Unassigned" },
        { key: "created", label: "Reported", render: r => fmtDate(r.createdAt), sort: r => r.createdAt },
      ]}/>
    {cur && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={`${reportCategoryLabel[cur.category]} · ${cur.id}`}>
      <p>{cur.summary}</p>
      <DetailList items={[["Status", <AdminStatusBadge key="s" status={cur.status}/>], ["Priority", <AdminStatusBadge key="p" status={cur.priority}/>], ["Reporter", l.userName(cur.reporterId)], ["Reported account", l.userName(cur.subjectUserId)], ["Listing", l.propertyTitle(cur.propertyId)], ["Reviewer", cur.assignee ?? "Unassigned"]]}/>
      <div className="admin-sheet-actions">{actions(cur).filter(a => !a.hidden).map(a => <Button key={a.label} size="sm" variant={a.destructive ? "outline" : "default"} onClick={a.onSelect}>{a.label}</Button>)}</div>
      <NoteForm onAdd={t => act.addNote("reports", cur.id, t, name(cur))}/><h3>Internal notes</h3><AdminAuditTimeline items={notesToTimeline(cur.notes)} empty="No notes yet."/>
    </AdminDetailPanel>}
    {dialog}
  </>;
}
