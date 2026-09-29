import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { changeUserRole, listAccounts, setAccountStatus } from "@/lib/auth/auth.functions";
import { ACCOUNT_STATUSES, ROLES, canAssignRole, roleLabel, type AccountStatus, type AuthRole } from "@/lib/auth/roles";
import { useCurrentUser } from "@/lib/auth/use-current-user";

/** Live accounts from the database. Every change is authorized and audited on the server. */
export function RealAccountsPanel() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "accounts"], queryFn: () => listAccounts() });
  const done = (msg: string) => ({ onSuccess: () => { toast.success(msg); void qc.invalidateQueries({ queryKey: ["admin", "accounts"] }); }, onError: (e: Error) => toast.error(e.message) });
  const role = useMutation({ mutationFn: (d: { userId: string; role: AuthRole }) => changeUserRole({ data: d }), ...done("Role updated") });
  const status = useMutation({ mutationFn: (d: { userId: string; status: AccountStatus }) => setAccountStatus({ data: d }), ...done("Account status updated") });

  return <section className="admin-accounts dash-panel" aria-labelledby="real-accounts">
    <p className="kicker">LIVE ACCOUNTS</p>
    <h2 id="real-accounts">Registered accounts</h2>
    <p className="form-hint">These are real sign-ups stored in the database. Role and status changes take effect immediately and are recorded in the audit log. Accounts are never deleted.</p>
    {q.isPending ? <p>Loading accounts…</p> : q.isError ? <p role="alert">{(q.error as Error).message}</p> : !q.data?.length ? <p>No accounts yet.</p> :
      <div className="table-scroll"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>
        {q.data.map(a => {
          const self = a.id === user?.id;
          return <tr key={a.id}>
            <td>{a.name || "—"}{self && " (you)"}</td><td>{a.email}</td>
            <td><select aria-label={`Role for ${a.email}`} value={a.role} disabled={self || !user} onChange={e => role.mutate({ userId: a.id, role: e.target.value as AuthRole })}>
              {ROLES.filter(r => r === a.role || (user && canAssignRole(user.role, r, a.role as AuthRole))).map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
            </select></td>
            <td><select aria-label={`Status for ${a.email}`} value={a.status} disabled={self} onChange={e => status.mutate({ userId: a.id, status: e.target.value as AccountStatus })}>
              {ACCOUNT_STATUSES.map(s => <option key={s} value={s}>{s.toLowerCase()}</option>)}
            </select></td>
            <td>{new Date(a.createdAt).toLocaleDateString("en-IN")}</td>
          </tr>;
        })}
      </tbody></table></div>}
  </section>;
}
