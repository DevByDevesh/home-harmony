import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminDataTable, AdminDetailPanel, AdminHeader, AdminStatusBadge, DetailList, fmtDate, type RowAction } from "@/components/admin/admin-kit";
import { useConfirm } from "@/components/admin/use-confirm";
import { adminHead } from "@/lib/admin/head";
import { inr } from "@/lib/catalog";
import { getListingModerationConfigFn, listAdminPropertiesFn, moderateListingFn } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/properties")({ head: adminHead("Properties"), component: AdminProperties });

type LiveProperty = Awaited<ReturnType<typeof listAdminPropertiesFn>>[number];

const statuses = ["DRAFT", "UNDER_REVIEW", "ACTIVE", "REJECTED", "SUSPENDED", "PAUSED", "EXPIRED", "DELETED", "ARCHIVED"];

function AdminProperties() {
  const [rows, setRows] = useState<LiveProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [ask, dialog] = useConfirm();
  const [rejectionReasonRequired, setRejectionReasonRequired] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await listAdminPropertiesFn());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); void getListingModerationConfigFn().then(c => setRejectionReasonRequired(c.rejectionReasonRequired)).catch(() => undefined); }, []);

  const moderate = async (p: LiveProperty, action: "APPROVE" | "REQUEST_CHANGES" | "REJECT" | "PAUSE" | "RESUME" | "ARCHIVE" | "RESTORE" | "DELETE", note?: string) => {
    try {
      const result = await moderateListingFn({ data: { propertyId: p.id, action, ...(note ? { note } : {}) } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moderation action failed.");
    }
  };

  const actions = (p: LiveProperty): RowAction[] => [
    { label: "Approve", hidden: p.status !== "UNDER_REVIEW", onSelect: () => void moderate(p, "APPROVE") },
    { label: "Request changes", hidden: p.status !== "UNDER_REVIEW", onSelect: () => void moderate(p, "REQUEST_CHANGES", "Please review the listing details and resubmit.") },
    { label: "Reject", hidden: p.status !== "UNDER_REVIEW", destructive: true, onSelect: () => {
      const reason = window.prompt(
        rejectionReasonRequired
          ? `Reason for rejecting “${p.title}” (required):`
          : `Reason for rejecting “${p.title}” (optional):`,
        "",
      )?.trim();
      if (reason === undefined) return;
      if (rejectionReasonRequired && !reason) {
        setError("A rejection reason is required.");
        return;
      }
      void moderate(p, "REJECT", reason || undefined);
    } },
    { label: "Suspend Listing", hidden: p.status !== "ACTIVE", destructive: true, onSelect: () => void moderate(p, "PAUSE") },
    { label: "Resume", hidden: p.status !== "SUSPENDED" && p.status !== "PAUSED", onSelect: () => void moderate(p, "RESUME") },
        { label: "Delete Listing", hidden: p.status === "DELETED", destructive: true, onSelect: () => ask({
      title: `Permanently delete “${p.title}”?`,
      description: "This permanently removes the listing and its listing-specific data. This action cannot be undone.",
      confirm: "Delete permanently",
      onConfirm: () => void moderate(p, "DELETE"),
    }) },
{ label: "Archive", hidden: p.status === "ARCHIVED", destructive: true, onSelect: () => ask({
      title: `Archive “${p.title}”?`,
      description: "Archived listings are hidden from seekers but retained in the database.",
      confirm: "Archive",
      onConfirm: () => void moderate(p, "ARCHIVE"),
    }) },
    { label: "Restore to review", hidden: p.status !== "ARCHIVED", onSelect: () => void moderate(p, "RESTORE") },
  ];

  const current = useMemo(() => rows.find(p => p.id === open) ?? null, [rows, open]);

  return <>
    <AdminHeader title="Properties" intro="Live PostgreSQL listings. Approval makes a listing visible — it does not make it verified." />
    {error && <p className="admin-field-error" role="alert">{error}</p>}
    <div className="admin-note">
      {loading ? "Loading live listings…" : `${rows.length} live database records loaded.`}
      <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>Refresh</Button>
    </div>
    <AdminDataTable
      rows={rows}
      ready={!loading}
      caption="Live properties"
      emptyTitle="No properties found."
      rowLabel={p => p.title}
      onOpen={p => setOpen(p.id)}
      actions={actions}
      search={p => `${p.title} ${p.locality} ${p.city} ${p.ownerName} ${p.agentName ?? ""} ${p.id}`}
      filters={[{ key: "status", label: "Status", options: statuses, get: p => p.status }, { key: "reports", label: "Reports", options: ["REPORTED"], get: p => p.reports > 0 ? "REPORTED" : "" }]}
      columns={[
        { key: "title", label: "Property", render: p => <span className="admin-cell-main"><strong>{p.title}</strong><small>{p.id} · {p.locality}, {p.city}</small></span>, sort: p => p.title },
        { key: "price", label: "Price", render: p => `${inr(p.price)}${p.mode === "Rent" ? "/mo" : ""}`, sort: p => p.price },
        { key: "owner", label: "Owner / agent", render: p => `${p.ownerName}${p.agentName ? ` · ${p.agentName}` : ""}` },
        { key: "status", label: "Listing status", render: p => <AdminStatusBadge status={p.status} />, sort: p => p.status },
        { key: "verification", label: "Verification", render: p => <AdminStatusBadge status={p.verification} /> },
        { key: "flags", label: "Reports", render: p => p.reports ? <span className="admin-tag admin-tag-warn">{p.reports} report{p.reports > 1 ? "s" : ""}</span> : "—", sort: p => p.reports },
        { key: "updated", label: "Updated", render: p => fmtDate(p.updatedAt), sort: p => p.updatedAt },
      ]}
    />
    {current && <AdminDetailPanel open onOpenChange={o => !o && setOpen(null)} title={current.title} description={`Live PostgreSQL property record. Rejection reason is ${rejectionReasonRequired ? "required" : "optional"}.`}>
      <DetailList items={[
        ["ID", current.id],
        ["Location", `${current.locality}, ${current.city}`],
        ["Price", inr(current.price)],
        ["Owner", current.ownerName],
        ["Agent", current.agentName ?? "—"],
        ["Listing status", <AdminStatusBadge key="s" status={current.status} />],
        ["Verification", <AdminStatusBadge key="v" status={current.verification} />],
        ["Reports", current.reports],
        ["Moderation note", current.changesRequested ?? "—"],
      ]} />
      <div className="admin-sheet-actions">
        {actions(current).filter(a => !a.hidden).map(a => <Button key={a.label} size="sm" variant={a.destructive ? "outline" : "default"} onClick={a.onSelect}>{a.label}</Button>)}
        <Button asChild size="sm" variant="ghost"><Link to="/property/$slug" params={{ slug: current.slug }}>Open public page</Link></Button>
      </div>
    </AdminDetailPanel>}
    {dialog}
  </>;
}
