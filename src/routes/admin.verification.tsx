import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminAuditTimeline, AdminDataTable, AdminDetailPanel, AdminHeader, AdminStatusBadge, DetailList, NoteForm, fmtDate, notesToTimeline, type RowAction } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { lookups, useAdminActions, useAdminData } from "@/lib/admin/repository";
import { verificationTypeLabel } from "@/lib/admin/config";
import { adminHead } from "@/lib/admin/head";
import { LiveVerificationsPanel } from "@/components/admin/live-trust";
import type { VerificationCase } from "@/lib/admin/types";

export const Route = createFileRoute("/admin/verification")({ head: adminHead("Verification"), component: AdminVerification });

function AdminVerification() {
  const { data: s, ready } = useAdminData(); const act = useAdminActions(); const l = lookups(s);
  const [ask, dialog] = useConfirm(); const [open, setOpen] = useState<string | null>(null);
  const label = (v: VerificationCase) => `${verificationTypeLabel[v.type]} · ${l.userName(v.userId)}`;
  const actions = (v: VerificationCase): RowAction[] => [
    { label: "Start review", hidden: v.status !== "PENDING", onSelect: () => act.reviewVerification(v.id, "IN_REVIEW", label(v)) },
    { label: "Approve", hidden: v.status !== "IN_REVIEW", onSelect: () => ask({ title: "Approve this check?", description: "Only approve after inspecting the required evidence.", confirm: "Approve", onConfirm: () => act.reviewVerification(v.id, "VERIFIED", label(v)) }) },
    { label: "Reject", hidden: v.status !== "IN_REVIEW" && v.status !== "PENDING", destructive: true, onSelect: () => ask({ title: "Reject this check?", description: "The account holder can resubmit.", confirm: "Reject", onConfirm: () => act.reviewVerification(v.id, "REJECTED", label(v)) }) },
    { label: "Request more information", hidden: v.status !== "IN_REVIEW", onSelect: () => act.reviewVerification(v.id, "PENDING", label(v), "Additional information requested from account holder") },
  ];
  const queue = s.verifications.filter(v => v.status === "PENDING" || v.status === "IN_REVIEW").length;
  const cur = s.verifications.find(v => v.id === open);
  return <>
    <AdminHeader title="Verification center" intro={queue ? `${queue} check${queue > 1 ? "s" : ""} waiting for review.` : "No pending verifications."}/>
    <LiveVerificationsPanel/>
    <p className="admin-note">Verification requires the relevant identity, property or supporting evidence before approval.</p>
    <AdminDataTable rows={s.verifications} ready={ready} caption="Verification queue" emptyTitle="No pending verifications." rowLabel={label} onOpen={v => setOpen(v.id)} actions={actions}
      search={v => `${label(v)} ${l.propertyTitle(v.propertyId)}`}
      filters={[{ key: "type", label: "Type", options: Object.keys(verificationTypeLabel), get: v => v.type }, { key: "status", label: "Status", options: ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "EXPIRED"], get: v => v.status }]}
      columns={[
        { key: "type", label: "Type", render: v => verificationTypeLabel[v.type], sort: v => v.type },
        { key: "subject", label: "Related", render: v => <span className="admin-cell-main"><strong>{l.userName(v.userId)}</strong>{v.propertyId && <small>{l.propertyTitle(v.propertyId)}</small>}</span> },
        { key: "status", label: "Status", render: v => <AdminStatusBadge status={v.status}/>, sort: v => v.status },
        { key: "submitted", label: "Submitted", render: v => fmtDate(v.submittedAt), sort: v => v.submittedAt },
        { key: "updated", label: "Last updated", render: v => fmtDate(v.updatedAt), sort: v => v.updatedAt },
        { key: "reviewer", label: "Reviewer", render: v => v.reviewer ?? "Unassigned" },
      ]}/>
    {cur && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={label(cur)} description="Review the submitted verification evidence before taking action.">
      <DetailList items={[["Status", <AdminStatusBadge key="s" status={cur.status}/>], ["Property", l.propertyTitle(cur.propertyId)], ["Submitted", fmtDate(cur.submittedAt)], ["Reviewer", cur.reviewer ?? "Unassigned"], ["Evidence", "No evidence submitted"]]}/>
      <div className="admin-sheet-actions">{actions(cur).filter(a => !a.hidden).map(a => <Button key={a.label} size="sm" variant={a.destructive ? "outline" : "default"} onClick={a.onSelect}>{a.label}</Button>)}</div>
      <NoteForm onAdd={t => act.addNote("verifications", cur.id, t, label(cur))}/>
      <h3>Internal notes</h3><AdminAuditTimeline items={notesToTimeline(cur.notes)} empty="No notes yet."/>
      <h3>Audit trail</h3><AdminAuditTimeline items={notesToTimeline(cur.history)}/>
    </AdminDetailPanel>}
    {dialog}
  </>;
}

