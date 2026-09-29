import { Bell, CalendarCheck, Send } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { createEnquiryFn, listMyEnquiriesFn, listMyNotificationsFn, listOwnerEnquiriesFn, listOwnerVisitsFn, ownerUpdateVisitFn, type OwnerVisit } from "@/lib/engagement.functions";
import { formatVisitDate, slotsFor, statusLabel, toISODate, visitTransitions, type VisitStatus } from "@/lib/visits";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** Owner: visit requests for their own database listings. */
export function OwnerDbVisits() {
  const fetch = useServerFn(listOwnerVisitsFn);
  const q = useQuery({ queryKey: ["owner-db-visits"], queryFn: () => fetch() });
  const rows = q.data ?? [];
  if (!rows.length) return null;
  return <ul className="dash-list">{rows.map(v => <OwnerVisitRow key={v.id} v={v}/>)}</ul>;
}

function OwnerVisitRow({ v }: { v: OwnerVisit }) {
  const qc = useQueryClient();
  const update = useServerFn(ownerUpdateVisitFn);
  const act = async (status: Exclude<VisitStatus, "REQUESTED">, date?: string, slot?: string) => {
    try {
      const r = await update({ data: { id: v.id, status, ...(date ? { date } : {}), ...(slot ? { slot } : {}) } });
      if (!r.ok) { toast.error(r.message); return false; }
      await qc.invalidateQueries({ queryKey: ["owner-db-visits"] });
      toast.success(`Marked ${statusLabel[status].toLowerCase()}`);
      return true;
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t update this visit."); return false; }
  };
  return <li><div><strong>{v.visitor} · {v.title}</strong><small>{formatVisitDate(v.date)} at {v.slot}{v.note ? ` · “${v.note}”` : ""}</small><span className={`status status-${v.status.toLowerCase()}`}>{statusLabel[v.status]}</span></div>
    <div className="dash-row-actions">{visitTransitions[v.status].map(s => s === "RESCHEDULED"
      ? <RescheduleDialog key={s} onSave={(d, t) => act("RESCHEDULED", d, t)}/>
      : <Button key={s} size="sm" variant={s === "CONFIRMED" ? "default" : "outline"} onClick={() => act(s as Exclude<VisitStatus, "REQUESTED">)}>{s === "CONFIRMED" ? "Accept" : s === "CANCELLED" ? "Decline" : statusLabel[s]}</Button>)}</div></li>;
}

function RescheduleDialog({ onSave }: { onSave: (date: string, slot: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(toISODate(tomorrow));
  const [slot, setSlot] = useState("");
  const slots = date ? slotsFor(date) : [];
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline">Reschedule</Button></DialogTrigger>
    <DialogContent className="visit-dialog"><DialogHeader><DialogTitle>Reschedule visit</DialogTitle><DialogDescription>Pick a new date and time. The visitor sees the change in their notifications.</DialogDescription></DialogHeader>
      <input type="date" className="filter-select" aria-label="New date" min={toISODate(tomorrow)} value={date} onChange={e => { setDate(e.target.value); setSlot(""); }}/>
      {slots.length ? <div className="slot-grid" role="group" aria-label="Time slot">{slots.map(s => <button type="button" key={s} className="pill" aria-pressed={slot === s} onClick={() => setSlot(s)}>{s}</button>)}</div> : <p className="form-hint">No slots on this day.</p>}
      <Button disabled={!date || !slot} onClick={async () => { if (await onSave(date, slot)) setOpen(false); }}>Save new time</Button>
    </DialogContent></Dialog>;
}

/** Owner: enquiries for their own listings. */
export function OwnerDbEnquiries({ empty }: { empty: ReactNode }) {
  const fetch = useServerFn(listOwnerEnquiriesFn);
  const rows = useQuery({ queryKey: ["owner-db-enquiries"], queryFn: () => fetch() }).data ?? [];
  if (!rows.length) return <>{empty}</>;
  return <ul className="dash-list">{rows.map(e => <li key={e.id}><div><strong>{e.from} · {e.title}</strong><small>“{e.message}”</small><small>{when(e.createdAt)}</small></div><div className="dash-row-actions"><span className="status">{e.status.toLowerCase()}</span></div></li>)}</ul>;
}

/** Seeker: send an enquiry about a live listing. Signed-in only. */
export function EnquiryButton({ slug, name }: { slug: string; name: string }) {
  const { user } = useCurrentUser();
  const send = useServerFn(createEnquiryFn);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return <Button asChild variant="outline" className="detail-more"><Link to="/login"><Send size={17}/>Sign in to send an enquiry</Link></Button>;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="detail-more"><Send size={17}/>Send an enquiry</Button></DialogTrigger>
    <DialogContent className="visit-dialog"><DialogHeader><DialogTitle>Send an enquiry</DialogTitle><DialogDescription>{name}. Your message goes to the listing owner’s account. No email or phone is shared.</DialogDescription></DialogHeader>
      <label className="visit-note">Message<textarea maxLength={1000} value={msg} onChange={e => setMsg(e.target.value)} placeholder="What would you like to know?"/></label>
      <Button disabled={busy || msg.trim().length < 5} onClick={async () => {
        setBusy(true);
        try { const r = await send({ data: { slug, message: msg.trim() } }); if (!r.ok) toast.error(r.message); else { toast.success("Enquiry sent to the owner"); setMsg(""); setOpen(false); qc.invalidateQueries({ queryKey: ["my-enquiries"] }); qc.invalidateQueries({ queryKey: ["my-notifications"] }); } }
        catch (e) { toast.error(e instanceof Error ? e.message : "Couldn’t send the enquiry."); } finally { setBusy(false); }
      }}>Send enquiry</Button>
    </DialogContent></Dialog>;
}

/** Seeker: own enquiries; falls back to `empty` when signed out or none. */
export function MyEnquiries({ empty }: { empty: ReactNode }) {
  const fetch = useServerFn(listMyEnquiriesFn);
  const rows = useQuery({ queryKey: ["my-enquiries"], queryFn: () => fetch() }).data;
  if (!rows?.length) return <>{empty}</>;
  return <ul className="dash-list">{rows.map(e => <li key={e.id}><div><strong>{e.title}</strong><small>“{e.message}”</small><small>{when(e.createdAt)}</small></div><div className="dash-row-actions"><span className="status">{e.status.toLowerCase()}</span></div></li>)}</ul>;
}

/** Signed-in: account notifications (visit/enquiry events). Returns null when signed out. */
export function MyNotifications() {
  const fetch = useServerFn(listMyNotificationsFn);
  const rows = useQuery({ queryKey: ["my-notifications"], queryFn: () => fetch() }).data;
  if (!rows) return null;
  if (!rows.length) return <p className="form-hint"><Bell size={14}/> No account notifications yet.</p>;
  return <ul className="dash-list activity">{rows.map(n => <li key={n.id}><div><strong>{n.title}</strong><small>{n.message}</small><small>{when(n.createdAt)}</small></div></li>)}</ul>;
}

export const OwnerVisitsIcon = CalendarCheck;
