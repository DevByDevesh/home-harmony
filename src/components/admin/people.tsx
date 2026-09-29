import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminAuditTimeline, AdminDataTable, AdminDetailPanel, AdminStatusBadge, DetailList, fmtDate, fmtDateTime, type Column, type FilterDef, type RowAction } from "./admin-kit";
import { useConfirm } from "./use-confirm";
import { lookups, useAdminActions, useAdminData, type AdminState } from "@/lib/admin/repository";
import { assignableRoles } from "@/lib/admin/permissions";
import { roleInfo, type Role } from "@/lib/roles";
import type { AdminUser } from "@/lib/admin/types";

const statuses = ["ACTIVE", "SUSPENDED", "PENDING", "DEACTIVATED"];
const verifs = ["NOT_REQUESTED", "PENDING", "VERIFIED", "REJECTED", "EXPIRED"];

export function PeopleTable({ roles, extra = [], caption, emptyTitle }: { roles?: Role[]; extra?: ((s: AdminState) => Column<AdminUser>)[]; caption: string; emptyTitle: string }) {
  const { data: s, ready } = useAdminData();
  const act = useAdminActions();
  const [ask, dialog] = useConfirm();
  const [open, setOpen] = useState<string | null>(null);
  const rows = roles ? s.users.filter(u => roles.includes(u.role)) : s.users;
  const columns: Column<AdminUser>[] = [
    { key: "name", label: "Name", render: u => <span className="admin-cell-main"><strong>{u.name}</strong><small>{u.email}</small></span>, sort: u => u.name },
    ...(!roles || roles.length > 1 ? [{ key: "role", label: "Role", render: (u: AdminUser) => roleInfo[u.role].label, sort: (u: AdminUser) => u.role }] : []),
    ...extra.map(f => f(s)),
    { key: "status", label: "Status", render: u => <AdminStatusBadge status={u.status}/>, sort: u => u.status },
    { key: "verification", label: "Verification", render: u => <AdminStatusBadge status={u.verification}/> },
    { key: "joined", label: "Joined", render: u => fmtDate(u.joinedAt), sort: u => u.joinedAt },
  ];
  const filters: FilterDef<AdminUser>[] = [
    ...(!roles || roles.length > 1 ? [{ key: "role", label: "Role", options: roles ?? Object.keys(roleInfo), get: (u: AdminUser) => u.role }] : []),
    { key: "status", label: "Status", options: statuses, get: u => u.status },
    { key: "verification", label: "Verification", options: verifs, get: u => u.verification },
  ];
  const actions = (u: AdminUser): RowAction[] => [
    { label: "Suspend", hidden: u.status === "SUSPENDED" || u.role === "SUPER_ADMIN", destructive: true, onSelect: () => ask({ title: `Suspend ${u.name}?`, description: "The account keeps its records but can't sign in or post while suspended.", confirm: "Suspend", onConfirm: () => act.update("users", u.id, { status: "SUSPENDED" }, "User suspended", u.name, "users.manage") }) },
    { label: "Restore", hidden: u.status === "ACTIVE" || u.status === "PENDING", onSelect: () => act.update("users", u.id, { status: "ACTIVE" }, "User restored", u.name, "users.manage") },
    { label: "Deactivate", hidden: u.status === "DEACTIVATED" || u.role === "SUPER_ADMIN", destructive: true, onSelect: () => ask({ title: `Deactivate ${u.name}?`, description: "Records are kept, not deleted.", confirm: "Deactivate", onConfirm: () => act.update("users", u.id, { status: "DEACTIVATED" }, "User deactivated", u.name, "users.manage") }) },
    { label: "Mark verified", hidden: u.role !== "AGENT" || u.verification === "VERIFIED", onSelect: () => ask({ title: `Verify agent ${u.name}?`, description: "Only confirm after reviewing real documents. No documents exist in this demo.", confirm: "Mark verified", onConfirm: () => act.update("users", u.id, { verification: "VERIFIED" }, "Agent verified", u.name, "verification.review") }) },
  ];
  const current = s.users.find(u => u.id === open);
  return <>
    <AdminDataTable rows={rows} columns={columns} filters={filters} search={u => `${u.name} ${u.email} ${u.city} ${u.agency ?? ""}`} caption={caption} emptyTitle={emptyTitle} ready={ready} onOpen={u => setOpen(u.id)} actions={actions} rowLabel={u => u.name}/>
    {current && <UserDetail s={s} user={current} open={!!open} onOpenChange={o => !o && setOpen(null)} actions={actions(current)}/>}
    {dialog}
  </>;
}

function UserDetail({ s, user, open, onOpenChange, actions }: { s: AdminState; user: AdminUser; open: boolean; onOpenChange: (o: boolean) => void; actions: RowAction[] }) {
  const act = useAdminActions(); const l = lookups(s);
  const sub = s.subscriptions.find(x => x.userId === user.id);
  const props = s.properties.filter(p => p.ownerId === user.id || p.agentId === user.id);
  const reports = s.reports.filter(r => r.subjectUserId === user.id || r.reporterId === user.id);
  const activity = s.audit.filter(a => a.target === user.name).map(a => ({ at: a.at, by: a.admin, text: a.action }));
  return <AdminDetailPanel open={open} onOpenChange={onOpenChange} title={user.name} description={`${roleInfo[user.role].label} · fictional demo account`}>
    <DetailList items={[["Email", user.email], ["City", user.city], ["Status", <AdminStatusBadge key="s" status={user.status}/>], ["Verification", <AdminStatusBadge key="v" status={user.verification}/>], ...(user.agency ? [["Agency", user.agency] as [string, string]] : []), ["Joined", fmtDate(user.joinedAt)], ["Last active", fmtDateTime(user.lastActiveAt)], ["Subscription", sub ? `${l.plan(sub.planId)?.name} · ${sub.status.toLowerCase()} · renews ${fmtDate(sub.renewsAt)}` : "Free plan"]]}/>
    <label className="admin-field"><span>Role</span>
      <select value={user.role} disabled={!act.can("users.changeRole") || user.role === "SUPER_ADMIN"} onChange={e => act.update("users", user.id, { role: e.target.value as Role }, `Role changed to ${roleInfo[e.target.value as Role].label}`, user.name, e.target.value === "ADMIN" || e.target.value === "SUPER_ADMIN" ? "users.assignAdmin" : "users.changeRole")}>
        {[...new Set([user.role, ...assignableRoles(act.role)])].map(r => <option key={r} value={r}>{roleInfo[r].label}</option>)}
      </select><small>{act.can("users.assignAdmin") ? "Super admins can assign any role." : "Admins can't grant admin roles."}</small></label>
    <div className="admin-sheet-actions">{actions.filter(a => !a.hidden).map(a => <Button key={a.label} size="sm" variant={a.destructive ? "outline" : "default"} onClick={a.onSelect}>{a.label}</Button>)}</div>
    <h3>Properties ({props.length})</h3>{props.length ? <ul className="admin-mini-list">{props.map(p => <li key={p.id}><span>{p.title}</span><AdminStatusBadge status={p.status}/></li>)}</ul> : <p className="form-hint">No associated listings.</p>}
    <h3>Reports ({reports.length})</h3>{reports.length ? <ul className="admin-mini-list">{reports.map(r => <li key={r.id}><span>{r.summary}</span><AdminStatusBadge status={r.status}/></li>)}</ul> : <p className="form-hint">No reports involve this account.</p>}
    <h3>Admin activity</h3><AdminAuditTimeline items={activity}/>
  </AdminDetailPanel>;
}
