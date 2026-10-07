import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminHeader } from "@/components/admin/admin-kit";
import { listSupportTicketsFn, updateSupportTicketFn } from "@/lib/support.functions";
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/support";
import { adminHead } from "@/lib/admin/head";

export const Route = createFileRoute("/admin/support")({
  head: adminHead("Customer Support"),
  component: AdminSupport,
});

function AdminSupport() {
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["admin", "support-tickets"], queryFn: () => listSupportTicketsFn() });
  const [busy, setBusy] = useState<string | null>(null);

  const update = async (id: string, status: typeof SUPPORT_STATUSES[number], priority?: typeof SUPPORT_PRIORITIES[number]) => {
    setBusy(id);
    try {
      await updateSupportTicketFn({ data: { id, status, ...(priority ? { priority } : {}) } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "support-tickets"] });
    } finally { setBusy(null); }
  };

  return <main className="wrap admin-page">
    <AdminHeader title="Customer Support" intro="Manage user support tickets. Property-owner contact remains a separate property enquiry flow."/>
    {tickets.isPending ? <p>Loading…</p> : tickets.isError ? <p role="alert">{(tickets.error as Error).message}</p> :
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ticket</th><th>User</th><th>Category</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {tickets.data.map(t => <tr key={t.id}>
          <td><strong>{t.subject}</strong><br/><small>{t.description.slice(0, 120)}{t.description.length > 120 ? "…" : ""}</small></td>
          <td>Requester</td><td>{t.category}</td><td>{t.priority}</td><td>{t.status.replaceAll("_", " ")}</td>
          <td><select disabled={busy === t.id} value={t.status} onChange={e => void update(t.id, e.target.value as typeof SUPPORT_STATUSES[number])}>{SUPPORT_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <select disabled={busy === t.id} value={t.priority} onChange={e => void update(t.id, t.status as typeof SUPPORT_STATUSES[number], e.target.value as typeof SUPPORT_PRIORITIES[number])}>{SUPPORT_PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></td>
        </tr>)}
      </tbody></table></div>}
  </main>;
}
