import { CalendarCheck, CalendarX } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Listing } from "@/lib/catalog";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { createVisitFn } from "@/lib/engagement.functions";
import { formatVisitDate, slotsFor, toISODate } from "@/lib/visits";

export function VisitScheduler({ home }: { home: Listing }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<"today" | "tomorrow" | "pick">("tomorrow");
  const [picked, setPicked] = useState("");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "done">("idle");
  const [busy, setBusy] = useState(false);
  const { user } = useCurrentUser();
  const createVisit = useServerFn(createVisitFn);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const maxDate = new Date(now); maxDate.setDate(now.getDate() + 30);
  const date = day === "today" ? toISODate(now) : day === "tomorrow" ? toISODate(tomorrow) : picked;
  const slots = date ? slotsFor(date, now) : [];
  function reset() { setDay("tomorrow"); setPicked(""); setSlot(""); setNote(""); setStatus("idle"); }
  async function submit() {
    if (!date || !slot || busy) { setStatus("error"); return; }
    if (!user) return;
    setBusy(true);
    setStatus("idle");
    try {
      const result = await createVisit({ data: { slug: home.slug, date, time: slot, ...(note.trim() ? { note: note.trim() } : {}) } });
      if (!result.ok) { toast.error(result.message); setStatus("error"); return; }
      setStatus("done");
      toast.success("Visit request sent to the owner");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t request this visit.");
      setStatus("error");
    } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
    <DialogTrigger asChild><Button className="detail-more"><CalendarCheck size={17}/>{user ? "Schedule a visit" : "Sign in to schedule a visit"}</Button></DialogTrigger>
    <DialogContent className="visit-dialog">
      {status === "done" ? <div className="visit-done" role="status"><CalendarCheck size={34}/><DialogTitle>Visit request saved</DialogTitle><p>{home.name} · {formatVisitDate(date)} at {slot}</p><p className="demo-note">Visit request has been recorded. The property owner can respond through HouseProvider.</p><div className="visit-actions"><Button asChild variant="outline"><Link to="/dashboard" search={{ tab: "visits" }}>View my visits</Link></Button><Button onClick={() => setOpen(false)}>Done</Button></div></div> : <>
        <DialogHeader><DialogTitle>Schedule a visit</DialogTitle><DialogDescription>{home.name}, {home.neighborhood}. Choose a time that works for you; the owner will receive your request.</DialogDescription></DialogHeader>
        <div className="visit-days" role="group" aria-label="Visit day">
          {(["today", "tomorrow", "pick"] as const).map(d => <button type="button" key={d} className="pill" aria-pressed={day === d} onClick={() => { setDay(d); setSlot(""); }}>{d === "today" ? "Today" : d === "tomorrow" ? "Tomorrow" : "Select date"}</button>)}
        </div>
        {day === "pick" && <input type="date" className="filter-select" aria-label="Visit date" min={toISODate(tomorrow)} max={toISODate(maxDate)} value={picked} onChange={e => { setPicked(e.target.value); setSlot(""); }}/>}
        {date && <p className="visit-date">{formatVisitDate(date)}</p>}
        {date && (slots.length ? <div className="slot-grid" role="group" aria-label="Time slot">{slots.map(s => <button type="button" key={s} className="pill" aria-pressed={slot === s} onClick={() => { setSlot(s); setStatus("idle"); }}>{s}</button>)}</div>
          : <div className="no-slots"><CalendarX size={20}/>No available visit slots on this day. Try another date.</div>)}
        <label className="visit-note">Note (optional)<textarea maxLength={240} value={note} onChange={e => setNote(e.target.value)} placeholder="Anything you’d like to see?"/></label>
        {status === "error" && <p className="form-error" role="alert">{!date ? "Choose a date first." : !slot ? "Choose a time slot." : "Couldn’t save on this device. Check your browser storage settings."}</p>}
        <Button onClick={submit} disabled={!user || busy} className="visit-submit">{busy ? "Sending…" : "Request visit"}</Button>
      </>}
    </DialogContent>
  </Dialog>;
}


