import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/catalog";
import { adminListEnquiriesFn, adminListPropertiesFn, adminListVisitsFn, adminPropertyActionFn, adminSetEnquiryStatusFn, adminSetVisitStatusFn } from "@/lib/admin-data.functions";
import { statusLabel, visitTransitions } from "@/lib/visits";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Shell({ id, title, hint, q, head, children }: { id: string; title: string; hint: string; q: { isPending: boolean; isError: boolean; error: unknown; data?: unknown[] | undefined }; head: string[]; children: ReactNode }) {
  return <section className="admin-accounts dash-panel" aria-labelledby={id}>
    <p className="kicker">LIVE RECORDS</p><h2 id={id}>{title}</h2><p className="form-hint">{hint}</p>
    {q.isPending ? <p>Loading…</p> : q.isError ? <p role="alert">{(q.error as Error).message}</p> : !q.data?.length ? <p>No records yet.</p> :
      <div className="table-scroll"><table className="admin-table"><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
  </section>;
}
function useRun(key: string) {
  const qc = useQueryClient();
  return async (p: Promise<{ ok: boolean; message?: string }>, msg: string) => {
    try { const r = await p; if (!r.ok) toast.error(r.message ?? "Action failed"); else toast.success(msg); } catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); }
    await qc.invalidateQueries({ queryKey: ["admin", key] });
  };
}

const propActions: Record<string, ["approve" | "reject" | "pause" | "resume" | "archive" | "restore", string][]> = {
  UNDER_REVIEW: [["approve", "Approve"], ["reject", "Reject"], ["archive", "Archive"]], ACTIVE: [["pause", "Pause"], ["archive", "Archive"]],
  PAUSED: [["resume", "Resume"], ["archive", "Archive"]], ARCHIVED: [["restore", "Restore to review"]], RENTED: [["archive", "Archive"]], SOLD: [["archive", "Archive"]], EXPIRED: [["archive", "Archive"]],
};
export function LivePropertiesPanel() {
  const q = useQuery({ queryKey: ["admin", "properties"], queryFn: () => adminListPropertiesFn() }); const run = useRun("properties");
  return <Shell id="live-props" title="Listings in the database" hint="Real listings. Approving makes a listing visible to seekers — it never marks it verified. Every change is recorded in the audit log." q={q} head={["Property", "Price", "Owner", "Status", "Verification", "Updated", "Actions"]}>
    {q.data?.map(p => <tr key={p.id}><td><strong>{p.title}</strong><br/><small>{p.locality}, {p.city}</small></td><td>{inr(p.price)}{p.listingType === "RENT" ? "/mo" : ""}</td><td>{p.owner}</td><td>{p.status.replace("_", " ").toLowerCase()}</td><td>{p.verification.replace("_", " ").toLowerCase()}</td><td>{date(p.updatedAt)}</td>
      <td><div className="dash-row-actions">{(propActions[p.status] ?? []).map(([a, label]) => <Button key={a} size="sm" variant="outline" onClick={() => { if ((a === "reject" || a === "archive") && !window.confirm(`${label} “${p.title}”?`)) return; void run(adminPropertyActionFn({ data: { id: p.id, action: a } }), `${label}: ${p.title}`); }}>{label}</Button>)}</div></td></tr>)}
  </Shell>;
}

const enqStatuses = ["NEW", "CONTACTED", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export function LiveEnquiriesPanel() {
  const q = useQuery({ queryKey: ["admin", "enquiries"], queryFn: () => adminListEnquiriesFn() }); const run = useRun("enquiries");
  return <Shell id="live-enq" title="Enquiries in the database" hint="Real enquiries. Message text isn’t shown here. Status changes are recorded in the audit log." q={q} head={["Seeker", "Property", "Owner / agent", "Date", "Status", "Last activity"]}>
    {q.data?.map(e => <tr key={e.id}><td>{e.seeker}</td><td>{e.property}</td><td>{e.handler}</td><td>{date(e.createdAt)}</td>
      <td><select aria-label={`Status for enquiry on ${e.property}`} value={e.status} onChange={ev => void run(adminSetEnquiryStatusFn({ data: { id: e.id, status: ev.target.value as (typeof enqStatuses)[number] } }), "Enquiry status updated")}>{enqStatuses.map(s => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}</select></td><td>{date(e.lastActivityAt)}</td></tr>)}
  </Shell>;
}

export function LiveVisitsPanel() {
  const q = useQuery({ queryKey: ["admin", "visits"], queryFn: () => adminListVisitsFn() }); const run = useRun("visits");
  return <Shell id="live-visits" title="Visits in the database" hint="Real visit requests, using the same rules as owners. Changes are recorded in the audit log." q={q} head={["Property", "Visitor", "Owner / agent", "Date", "Time", "Status", "Actions"]}>
    {q.data?.map(v => <tr key={v.id}><td>{v.property}</td><td>{v.visitor}</td><td>{v.handler}</td><td>{date(v.date)}</td><td>{v.slot}</td><td>{statusLabel[v.status]}</td>
      <td><div className="dash-row-actions">{visitTransitions[v.status].filter((s): s is "CONFIRMED" | "COMPLETED" | "CANCELLED" => s !== "RESCHEDULED" && s !== "REQUESTED").map(s => <Button key={s} size="sm" variant="outline" onClick={() => { if (s === "CANCELLED" && !window.confirm("Cancel this visit?")) return; void run(adminSetVisitStatusFn({ data: { id: v.id, status: s } }), `Visit ${statusLabel[s].toLowerCase()}`); }}>{s === "CONFIRMED" ? "Confirm" : s === "COMPLETED" ? "Mark completed" : "Cancel"}</Button>)}</div></td></tr>)}
  </Shell>;
}
