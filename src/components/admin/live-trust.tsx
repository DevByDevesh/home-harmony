/** Live admin panels for the trust area (verifications, reports) backed by PostgreSQL. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { verificationTypeLabel } from "@/lib/admin/config";
import { adminListReportsFn, adminListVerificationsFn, adminSetVerificationStatusFn, adminUpdateReportFn } from "@/lib/admin-trust.functions";
import { moderateListingFn } from "@/lib/admin.functions";

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const lc = (s: string) => s.replace(/_/g, " ").toLowerCase();
type Q = { isPending: boolean; isError: boolean; error: unknown };

function Panel({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) {
  return <section className="admin-accounts dash-panel" aria-labelledby={id}><p className="kicker">LIVE RECORDS</p><h2 id={id}>{title}</h2><p className="form-hint">{hint}</p>{children}</section>;
}
function Table({ q, rows, head, children, empty }: { q: Q; rows?: unknown[] | undefined; head: string[]; children: ReactNode; empty: string }) {
  if (q.isPending) return <p>Loading…</p>;
  if (q.isError) return <p role="alert">{(q.error as Error).message}</p>;
  if (!rows?.length) return <p>{empty}</p>;
  return <div className="table-scroll"><table className="admin-table"><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function useRun(...keys: string[]) {
  const qc = useQueryClient();
  return async (p: Promise<{ ok: boolean; message?: string }>, msg: string) => {
    try { const r = await p; if (!r.ok) toast.error(r.message ?? "Action failed"); else toast.success(msg); } catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); }
    await Promise.all(keys.map(k => qc.invalidateQueries({ queryKey: ["admin", k] })));
  };
}

const typeLabel = (t: string) => verificationTypeLabel[t as keyof typeof verificationTypeLabel] ?? lc(t);

const veriActions: Record<string, [("start" | "approve" | "reject" | "revert"), string][]> = {
  PENDING: [["start", "Start review"], ["reject", "Reject"]],
  IN_REVIEW: [["approve", "Approve"], ["reject", "Reject"], ["revert", "Return to queue"]],
};

export function LiveVerificationsPanel() {
  const q = useQuery({ queryKey: ["admin", "verifications"], queryFn: () => adminListVerificationsFn() });
  const run = useRun("verifications", "properties");
  return <Panel id="live-veri" title="Verification requests in the database" hint="Real checks requested by owners when they submit or edit a listing. Approving a check confirms only that verification check. Listing publication is a separate moderation decision below. Decisions update the listing’s verification status, notify the requester in-app, and are recorded in the audit log. No evidence can be uploaded yet — decide only after verifying out of band.">
    <Table q={q} rows={q.data} head={["Type", "Requested by", "Listing", "Status", "Submitted", "Reviewer", "Actions"]} empty="No verification requests yet. Owners request checks when they submit or edit a listing.">
      {q.data?.map(v => <tr key={v.id}>
        <td>{typeLabel(v.type)}</td><td>{v.subject}</td><td>{v.property}</td><td>{lc(v.status)}</td><td>{date(v.submittedAt)}</td><td>{v.reviewer}</td>
        <td><div className="dash-row-actions">{(veriActions[v.status] ?? []).map(([a, label]) => <Button key={a} size="sm" variant="outline" onClick={() => {
          if ((a === "approve" || a === "reject") && !window.confirm(`${label} the ${typeLabel(v.type).toLowerCase()} check for ${v.subject}?`)) return;
          void run(adminSetVerificationStatusFn({ data: { id: v.id, action: a } }), `${label}: ${typeLabel(v.type)} · ${v.subject}`);
        }}>{a === "approve" ? "Approve check" : label}</Button>)}
          {v.propertyId && v.propertyStatus === "UNDER_REVIEW" && <>
            <Button size="sm" onClick={() => {
              if (!window.confirm(`Approve “${v.property}” and make it visible to seekers?`)) return;
              void run(moderateListingFn({ data: { propertyId: v.propertyId, action: "APPROVE" } }), `Listing approved: ${v.property}`);
            }}>Approve listing</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const reason = window.prompt(`Reason for rejecting “${v.property}”:`, "")?.trim();
              if (reason === undefined) return;
              if (!reason) {
                toast.error("A rejection reason is required.");
                return;
              }
              if (!window.confirm(`Reject “${v.property}”? This will keep it off the marketplace.`)) return;
              void run(moderateListingFn({ data: { propertyId: v.propertyId, action: "REJECT", note: reason } }), `Listing rejected: ${v.property}`);
            }}>Reject listing</Button>
          </>}
          {v.propertyId && v.propertyStatus === "ACTIVE" && <span className="admin-tag">Listing live</span>}
          {v.propertyId && v.propertySlug && <Button asChild size="sm" variant="ghost"><Link to="/property/$slug" params={{ slug: v.propertySlug }}>View</Link></Button>}
        </div></td>
      </tr>)}
    </Table>
  </Panel>;
}

const reportCategoryLabels: Record<string, string> = {
  FAKE_LISTING: "Fake listing", INCORRECT_INFORMATION: "Incorrect information", DUPLICATE_LISTING: "Duplicate listing", SUSPICIOUS_ACTIVITY: "Suspicious activity",
  HARASSMENT: "Harassment", SPAM: "Spam", PAYMENT_ISSUE: "Payment issue", OTHER: "Other",
};

export function LiveReportsPanel() {
  const q = useQuery({ queryKey: ["admin", "reports"], queryFn: () => adminListReportsFn() });
  const run = useRun("reports");
  const actions: Record<string, ["start" | "resolve" | "dismiss" | "reopen", string][]> = {
    OPEN: [["start", "Start review"], ["resolve", "Resolve"], ["dismiss", "Dismiss"]],
    IN_REVIEW: [["resolve", "Resolve"], ["dismiss", "Dismiss"]],
    RESOLVED: [["reopen", "Reopen"]],
    DISMISSED: [["reopen", "Reopen"]],
  };
  return <Panel id="live-reports" title="Reports in the database" hint="Real visitor reports. A report is not proof of wrongdoing; review the evidence before taking action.">
    <Table q={q} rows={q.data} head={["Category", "Summary", "Reported account", "Listing", "Priority", "Status", "Reviewer", "Reported", "Actions"]} empty="No reports in the database.">
      {q.data?.map(r => <tr key={r.id}>
        <td>{reportCategoryLabels[r.category] ?? lc(r.category)}</td><td>{r.summary}</td><td>{r.subject}</td><td>{r.property}</td>
        <td>{lc(r.priority)}</td><td>{lc(r.status)}</td><td>{r.assignee}</td><td>{date(r.createdAt)}</td>
        <td><div className="dash-row-actions">{(actions[r.status] ?? []).map(([action, label]) =>
          <Button key={action} size="sm" variant="outline" onClick={() => void run(adminUpdateReportFn({ data: { id: r.id, action } }), label)}>{label}</Button>
        )}</div></td>
      </tr>)}
    </Table>
  </Panel>;
}
