import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { changeUserRole, listAccounts, setAccountStatus } from "@/lib/auth/auth.functions";
import { adminListAdminActivityFn } from "@/lib/admin-trust.functions";
import { setAdminPermissions, listAdminPermissions } from "@/lib/auth/auth.functions";
import { ADMIN_PERMISSION_LABELS, GRANULAR_ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/admin/permissions";
import { ACCOUNT_STATUSES, ROLES, canAssignRole, roleLabel, type AccountStatus, type AuthRole } from "@/lib/auth/roles";
import { useCurrentUser } from "@/lib/auth/use-current-user";

/** Live accounts from the database. Every change is authorized and audited on the server. */
export function RealAccountsPanel({ roles, title = "Registered accounts" }: { roles?: AuthRole[]; title?: string }) {
  const { user } = useCurrentUser();
  const [confirmBan, setConfirmBan] = useState<{ id: string; name: string } | null>(null);
  const [activityUserId, setActivityUserId] = useState<string | null>(null);
  const [permissionUserId, setPermissionUserId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[] | null>(null);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "accounts"], queryFn: () => listAccounts() });
  const permissionQuery = useQuery({ queryKey: ["admin", "permissions", permissionUserId], queryFn: () => listAdminPermissions({ data: { userId: permissionUserId! } }), enabled: Boolean(permissionUserId) });
  const activity = useQuery({
    queryKey: ["admin", "activity", activityUserId],
    queryFn: () => adminListAdminActivityFn({ data: { userId: activityUserId! } }),
    enabled: Boolean(activityUserId),
  });
  const rows = roles ? q.data?.filter(a => roles.includes(a.role as AuthRole)) : q.data;
  const done = (msg: string) => ({
    onSuccess: () => { toast.success(msg); void qc.invalidateQueries({ queryKey: ["admin", "accounts"] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Action failed")
  });
  const role = useMutation({ mutationFn: (d: { userId: string; role: AuthRole; adminConfirmation?: boolean }) => changeUserRole({ data: d }), ...done("Role updated") });
  const permissions = useMutation({ mutationFn: (d: { userId: string; permissions: AdminPermission[] }) => setAdminPermissions({ data: d }), onSuccess: () => { toast.success("Admin permissions updated"); void qc.invalidateQueries({ queryKey: ["admin", "permissions", permissionUserId] }); }, onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Permission update failed") });
  const status = useMutation({ mutationFn: (d: { userId: string; status: AccountStatus }) => setAccountStatus({ data: d }), ...done("Account status updated") });
  const isOwner = user?.role === "OWNER";
  const openPermissions = (userId: string) => { setPermissionUserId(userId); setSelectedPermissions(null); };
  const confirmRoleAction = (message: string, userId: string, nextRole: AuthRole) => {
    if (!window.confirm(message)) return;
    role.mutate({ userId, role: nextRole, ...(nextRole === "ADMIN" ? { adminConfirmation: true } : {}) });
  };

  return <section className="admin-accounts dash-panel" aria-labelledby="real-accounts">
    <p className="kicker">LIVE ACCOUNTS</p>
    <h2 id="real-accounts">{title}</h2>
    <p className="form-hint">These are real sign-ups stored in the database. Role and status changes take effect immediately and are recorded in the audit log. Accounts are never deleted.</p>
    {q.isPending ? <p>Loading accounts…</p> : q.isError ? <p role="alert">{(q.error as Error).message}</p> : !rows?.length ? <p>No accounts yet.</p> :
      <div className="table-scroll"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Admin management</th><th>Joined</th></tr></thead><tbody>
        {rows.map(a => {
          const self = a.id === user?.id;
          return <tr key={a.id}>
            <td>{a.name || "—"}{self && " (you)"}</td><td>{a.email}</td>
            <td><select aria-label={`Role for ${a.email}`} value={a.role} disabled={self || !user} onChange={e => {
                const nextRole = e.target.value as AuthRole;
                if (nextRole === "ADMIN" && a.role === "USER") {
                  if (!window.confirm(`Confirm Admin appointment for ${a.name || a.email || "this user"}? The system will verify personal details and identity before applying the role.`)) return;
                  role.mutate({ userId: a.id, role: nextRole, adminConfirmation: true });
                  return;
                }
                role.mutate({ userId: a.id, role: nextRole });
              }}>
              {ROLES.filter(r => r === a.role || (user && canAssignRole(user.role, r, a.role as AuthRole))).map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </select></td>
            <td>
              {a.status === "ACTIVE" && !self ? <button type="button" className="text-link" onClick={() => setConfirmBan({ id: a.id, name: a.name || a.email || "Account" })}>Ban user</button> : null}
              <select aria-label={`Status for ${a.email}`} value={a.status} disabled={self} onChange={e => status.mutate({ userId: a.id, status: e.target.value as AccountStatus })}>
              {ACCOUNT_STATUSES.map(s => <option key={s} value={s}>{s.toLowerCase()}</option>)}
            </select></td>
            <td>
              {isOwner && a.role === "USER" ? <button type="button" className="text-link" onClick={() => confirmRoleAction(`Add ${a.name || a.email || "this user"} as Admin? The system will verify eligibility before applying the role.`, a.id, "ADMIN")}>Add Admin</button> : null}
              {isOwner && a.role === "ADMIN" ? <>
                <button type="button" className="text-link" onClick={() => confirmRoleAction(`Remove Admin privileges from ${a.name || a.email || "this user"}?`, a.id, "USER")}>Remove Admin</button>{" "}
                <button type="button" className="text-link" onClick={() => status.mutate({ userId: a.id, status: "SUSPENDED" })}>Suspend</button>{" "}
                <button type="button" className="text-link" onClick={() => openPermissions(a.id)}>Permissions</button>{" "}<button type="button" className="text-link" onClick={() => setActivityUserId(a.id)}>View activity</button>
              </> : null}

              {isOwner && a.role === "ADMIN" && a.status === "SUSPENDED" ? <button type="button" className="text-link" onClick={() => status.mutate({ userId: a.id, status: "ACTIVE" })}>Restore</button> : null}
            </td>
            <td>{new Date(a.createdAt).toLocaleDateString("en-IN")}</td>
          </tr>;
        })}
      </tbody></table></div>}
    {isOwner && permissionUserId ? <section className="dash-panel" aria-labelledby="admin-permissions-title">
      <h3 id="admin-permissions-title">Admin permissions</h3>
      {permissionQuery.isPending ? <p>Loading permissions…</p> : permissionQuery.isError ? <p role="alert">{(permissionQuery.error as Error).message}</p> : <>
        <p className="form-hint">Owner-controlled operational permissions. Admin Management and Owner Management are intentionally excluded from this editor.</p>
        <div className="admin-permission-grid">
          {GRANULAR_ADMIN_PERMISSIONS.map(permission => {
            const current = selectedPermissions ?? (permissionQuery.data?.permissions ?? []);
            const checked = current.includes(permission);
            return <label key={permission}><input type="checkbox" checked={checked} onChange={e => {
              const current = selectedPermissions ?? (permissionQuery.data?.permissions ?? []);
              setSelectedPermissions(e.target.checked ? [...current, permission] : current.filter(p => p !== permission));
            }} /> {ADMIN_PERMISSION_LABELS[permission]}</label>;
          })}
        </div>
        <button type="button" className="text-link" disabled={permissions.isPending} onClick={() => {
          const current = selectedPermissions ?? (permissionQuery.data?.permissions ?? []);
          permissions.mutate({ userId: permissionUserId, permissions: current });
        }}>Save permissions</button>{" "}
        <button type="button" className="text-link" onClick={() => { setPermissionUserId(null); setSelectedPermissions(null); }}>Close</button>
      </>}
    </section> : null}
    {isOwner && activityUserId ? <section className="dash-panel" aria-labelledby="admin-activity-title">
      <h3 id="admin-activity-title">Admin activity</h3>
      {activity.isPending ? <p>Loading activity…</p> : activity.isError ? <p role="alert">{(activity.error as Error).message}</p> : !activity.data?.length ? <p>No activity recorded for this account.</p> :
        <div className="table-scroll"><table className="admin-table"><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Result</th></tr></thead><tbody>
          {activity.data.map(entry => <tr key={entry.id}><td><time dateTime={entry.at}>{new Date(entry.at).toLocaleString("en-IN")}</time></td><td>{entry.actor}</td><td>{entry.action}</td><td>{entry.result}</td></tr>)}
        </tbody></table></div>}
      <button type="button" className="text-link" onClick={() => setActivityUserId(null)}>Close activity</button>
    </section> : null}
  </section>;
}
