import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, MoreHorizontal, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DemoLabel, MetricGrid, TrendCard } from "@/components/analytics-kit";
import type { Note } from "@/lib/admin/types";
import type { SeriesPoint } from "@/lib/analytics";

const tone: Record<string, string> = {
  ACTIVE: "good", VERIFIED: "good", SUCCEEDED: "good", RESOLVED: "good", COMPLETED: "good", CONFIRMED: "good", SUCCESS: "good",
  PENDING: "wait", IN_REVIEW: "wait", UNDER_REVIEW: "wait", PROCESSING: "wait", TRIAL: "wait", REQUESTED: "wait", NEW: "wait", OPEN: "wait", ASSIGNED: "wait", IN_PROGRESS: "wait", CONTACTED: "wait", RESCHEDULED: "wait", MEDIUM: "wait",
  SUSPENDED: "bad", REJECTED: "bad", FAILED: "bad", PAST_DUE: "bad", URGENT: "bad", HIGH: "bad", DENIED: "bad",
};
/** Status always shown as text plus tone — never colour alone. */
export function AdminStatusBadge({ status }: { status: string }) {
  return <span className={`astatus astatus-${tone[status] ?? "neutral"}`}>{status.replaceAll("_", " ").toLowerCase()}</span>;
}
export function AdminHeader({ title, intro, actions }: { title: string; intro: string; actions?: ReactNode }) {
  return <header className="admin-header"><div><p className="kicker">ADMIN · OPERATIONS</p><h1>{title}</h1><p>{intro}</p></div>{actions && <div className="admin-header-actions">{actions}</div>}</header>;
}
export const AdminMetricCard = MetricGrid;
export const AdminChartCard = TrendCard;
export function AdminDemoNote({ children }: { children?: ReactNode }) { return <DemoLabel>{children ?? "Records shown here are based on HouseProvider account activity."}</DemoLabel>; }
export function AdminEmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="admin-empty" role="status"><Inbox size={26}/><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
export function AdminLoadingState({ label = "Loading admin data" }: { label?: string }) {
  return <div className="admin-loading" aria-busy="true" aria-label={label}>{[0, 1, 2, 3].map(i => <span key={i}/>)}</div>;
}
export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="admin-error" role="alert"><AlertTriangle size={22}/><p>{message}</p>{onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}</div>;
}

export function AdminConfirmDialog({ trigger, title, description, confirm, onConfirm }: { trigger: ReactNode; title: string; description: string; confirm: string; onConfirm: () => void }) {
  return <AlertDialog><AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description} This is a demo action — no live backend update.</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>{confirm}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}

export type RowAction = { label: string; onSelect: () => void; hidden?: boolean; destructive?: boolean };
export function AdminActionMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const visible = actions.filter(a => !a.hidden);
  if (!visible.length) return null;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`Actions for ${label}`}><MoreHorizontal size={16}/></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuLabel className="sr-only">{label}</DropdownMenuLabel>{visible.map(a => <DropdownMenuItem key={a.label} onSelect={a.onSelect} className={a.destructive ? "text-destructive" : undefined}>{a.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}

export function AdminDetailPanel({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="admin-sheet"><SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{description ?? "HouseProvider record."}</SheetDescription></SheetHeader><div className="admin-sheet-body">{children}</div></SheetContent></Sheet>;
}
export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return <dl className="admin-dl">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}
export function AdminAuditTimeline({ items, empty = "No activity recorded yet." }: { items: { at: string; by: string; text: string }[]; empty?: string }) {
  if (!items.length) return <p className="form-hint">{empty}</p>;
  return <ol className="admin-timeline">{items.map((n, i) => <li key={i}><time dateTime={n.at}>{fmtDateTime(n.at)}</time><strong>{n.text}</strong><small>{n.by}</small></li>)}</ol>;
}
export function NoteForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return <form className="admin-note-form" onSubmit={e => { e.preventDefault(); if (text.trim()) { onAdd(text.trim()); setText(""); } }}>
    <label htmlFor="admin-note">Internal note</label><textarea id="admin-note" value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Visible to admins only"/>
    <Button size="sm" type="submit" disabled={!text.trim()}>Add note</Button></form>;
}
export const notesToTimeline = (notes: Note[]) => [...notes].reverse();

export type Column<T> = { key: string; label: string; render: (row: T) => ReactNode; sort?: (row: T) => string | number };
export type FilterDef<T> = { key: string; label: string; options: string[]; get: (row: T) => string };
/**
 * Local table with search, filters, sort and pagination. Signatures match a future
 * server query ({ q, filters, sort, page }), so swapping to server pagination keeps the UI.
 */
export function AdminDataTable<T extends { id: string }>({ rows, columns, search, filters = [], pageSize = 8, caption, emptyTitle, onOpen, actions, ready = true, rowLabel }: {
  rows: T[]; columns: Column<T>[]; search?: (row: T) => string; filters?: FilterDef<T>[]; pageSize?: number; caption: string; emptyTitle: string;
  onOpen?: (row: T) => void; actions?: (row: T) => RowAction[]; ready?: boolean; rowLabel: (row: T) => string;
}) {
  const [q, setQ] = useState(""); const [active, setActive] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null); const [page, setPage] = useState(0);
  const reduced = useReducedMotion();
  const result = useMemo(() => {
    let out = rows.filter(r => (!q || (search?.(r) ?? "").toLowerCase().includes(q.toLowerCase())) && filters.every(f => !active[f.key] || f.get(r) === active[f.key]));
    const col = sort && columns.find(c => c.key === sort.key);
    if (col?.sort) out = [...out].sort((a, b) => { const x = col.sort!(a), y = col.sort!(b); return (x > y ? 1 : x < y ? -1 : 0) * sort!.dir; });
    return out;
  }, [rows, q, active, sort, columns, filters, search]);
  const pages = Math.max(1, Math.ceil(result.length / pageSize)); const current = Math.min(page, pages - 1);
  const visible = result.slice(current * pageSize, current * pageSize + pageSize);
  const filtered = !!q || Object.values(active).some(Boolean);
  return <section className="admin-table-wrap" aria-label={caption}>
    <div className="admin-filters" role="search">
      {search && <label className="admin-search"><Search size={15}/><span className="sr-only">Search {caption}</span><Input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Search"/></label>}
      {filters.map(f => <label key={f.key} className="admin-select"><span>{f.label}</span><select value={active[f.key] ?? ""} onChange={e => { setActive({ ...active, [f.key]: e.target.value }); setPage(0); }}><option value="">All</option>{f.options.map(o => <option key={o} value={o}>{o.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>)}
      {filtered && <Button size="sm" variant="ghost" onClick={() => { setQ(""); setActive({}); }}>Clear</Button>}
      <span className="admin-count" aria-live="polite">{result.length} {result.length === 1 ? "record" : "records"}</span>
    </div>
    {!ready ? <AdminLoadingState/> : result.length === 0 ? <AdminEmptyState title={filtered ? `${emptyTitle.replace(/\.$/, "")} match these filters.` : emptyTitle}>{filtered ? "Try clearing a filter." : undefined}</AdminEmptyState> :
    <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">{caption}</caption>
      <thead><tr>{columns.map(c => <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>{c.sort ? <button type="button" onClick={() => setSort(s => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}>{c.label}<span aria-hidden>{sort?.key === c.key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}</span></button> : c.label}</th>)}{(onOpen || actions) && <th scope="col"><span className="sr-only">Actions</span></th>}</tr></thead>
      <tbody>{visible.map((r, i) => <motion.tr key={r.id} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, delay: Math.min(i * .025, .2) }}>
        {columns.map(c => <td key={c.key} data-label={c.label}>{c.render(r)}</td>)}
        {(onOpen || actions) && <td className="admin-row-actions">{onOpen && <Button size="sm" variant="outline" onClick={() => onOpen(r)} aria-label={`View ${rowLabel(r)}`}>View</Button>}{actions && <AdminActionMenu label={rowLabel(r)} actions={actions(r)}/>}</td>}
      </motion.tr>)}</tbody></table></div>}
    {pages > 1 && <nav className="admin-pager" aria-label={`${caption} pages`}><Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={14}/> Previous</Button><span>Page {current + 1} of {pages}</span><Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next <ChevronRight size={14}/></Button></nav>}
  </section>;
}

export function Distribution({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return <figure className="admin-dist"><figcaption>{title}</figcaption>{data.every(d => d.value === 0) ? <p className="chart-empty">No data yet.</p> : <ul>{data.map(d => <li key={d.label}><span>{d.label}</span><div aria-hidden><i style={{ transform: `scaleX(${d.value / max})` }}/></div><strong>{d.value}</strong></li>)}</ul>}</figure>;
}
export const toSeries = (entries: [string, number][]): SeriesPoint[] => entries.map(([label, value]) => ({ label, value }));
export function fmtDate(iso: string) { return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }
export function fmtDateTime(iso: string) { return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }); }
export function count<T>(rows: T[], get: (r: T) => string, keys: string[]) { return keys.map(k => ({ label: k.replaceAll("_", " ").toLowerCase(), value: rows.filter(r => get(r) === k).length })); }
export function UserLink({ name }: { name: string }) { return <span className="admin-strong">{name}</span>; }
export { Link };

