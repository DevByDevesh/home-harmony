import { Bell, CalendarCheck, MessageCircle, MessageSquare, Phone, Send, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { createEnquiryFn, startConversationFn, listMyEnquiriesFn, listMyNotificationsFn, listMyVisitsFn, cancelMyVisitFn, listOwnerEnquiriesFn, listOwnerVisitsFn, ownerUpdateVisitFn, listConversationsFn, getConversationFn, sendMessageFn, markConversationReadFn, type OwnerVisit } from "@/lib/engagement.functions";
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

export function MyDbVisits() {
  const fetch = useServerFn(listMyVisitsFn);
  const cancel = useServerFn(cancelMyVisitFn);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-db-visits"], queryFn: () => fetch() });
  const rows = q.data ?? [];

  if (!rows.length) {
    return <EmptyState icon={<CalendarCheck size={30}/>} title="No visits scheduled">
      Open a property and choose “Schedule a visit”.
    </EmptyState>;
  }

  return <ul className="dash-list">{rows.map(v => (
    <li key={v.id}>
      <div>
        <strong>{v.title}</strong>
        <small>{formatVisitDate(v.date)} at {v.slot}{v.note ? ` · “${v.note}”` : ""}</small>
        <small>{statusLabel[v.status]}</small>
      </div>
      <div className="dash-row-actions">
        <span className={`status status-${v.status.toLowerCase()}`}>{statusLabel[v.status]}</span>
        {visitTransitions[v.status].includes("CANCELLED") && (
          <Button size="sm" variant="ghost" onClick={async () => {
            const result = await cancel({ data: { id: v.id } });
            if (!result.ok) toast.error(result.message);
            else { toast.success("Visit request cancelled"); qc.invalidateQueries({ queryKey: ["my-db-visits"] }); }
          }}>Cancel</Button>
        )}
      </div>
    </li>
  ))}</ul>;
}

/** Seeker: send an enquiry about a live listing. Signed-in only. */
export function EnquiryButton({ slug, name, ownerPhone, ownerContactChannels }: { slug: string; name: string; ownerPhone?: string | null | undefined; ownerContactChannels?: string[] | undefined }) {
  const { user } = useCurrentUser();
  const send = useServerFn(startConversationFn);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = ownerPhone?.replace(/[^+\d]/g, "");
  const channels = ownerContactChannels?.map((channel) => channel.toUpperCase()) ?? [];
  const canCall = !!phone && channels.some((channel) => channel.includes("PHONE") || channel.includes("CALL") || channel.includes("BOTH"));
  const canWhatsApp = !!phone && channels.some((channel) => channel.includes("WHATSAPP") || channel.includes("BOTH"));

  const messageButton = user
    ? <DialogTrigger asChild><Button variant="outline" className="detail-more"><MessageCircle size={17}/>Message Owner</Button></DialogTrigger>
    : <Button asChild variant="outline" className="detail-more"><Link to="/login"><MessageCircle size={17}/>Message Owner</Link></Button>;

  return <div className="detail-contact-actions">
    {user ? <Dialog open={open} onOpenChange={setOpen}>
      {messageButton}
      <DialogContent className="visit-dialog"><DialogHeader><DialogTitle>Message Owner</DialogTitle><DialogDescription>{name}. Your message goes to the listing owner’s account. No email or phone is shared.</DialogDescription></DialogHeader>
        <label className="visit-note">Message<textarea maxLength={1000} value={msg} onChange={e => setMsg(e.target.value)} placeholder="What would you like to know?"/></label>
        <Button disabled={busy || msg.trim().length < 5} onClick={async () => {
          setBusy(true);
          try {
            const r = await send({ data: { slug, message: msg.trim() } });
            if (!r.ok) toast.error(r.message);
            else {
              toast.success("Message sent to the owner");
              setMsg("");
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["my-enquiries"] });
              qc.invalidateQueries({ queryKey: ["my-notifications"] });
              qc.invalidateQueries({ queryKey: ["conversations"] });
            }
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn’t send the message.");
          } finally {
            setBusy(false);
          }
        }}>Send message</Button>
      </DialogContent>
    </Dialog> : messageButton}
    {canCall && <Button asChild variant="outline" className="detail-more"><a href={`tel:${phone}`}><Phone size={17}/>Call</a></Button>}
    {canWhatsApp && <Button asChild variant="outline" className="detail-more"><a href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={17}/>WhatsApp</a></Button>}
  </div>;
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

export function ChatPanel() {
  const { user } = useCurrentUser();
  const fetchConversations = useServerFn(listConversationsFn);
  const fetchConversation = useServerFn(getConversationFn);
  const send = useServerFn(sendMessageFn);
  const markRead = useServerFn(markConversationReadFn);
  const [selected, setSelected] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations(),
    refetchInterval: 5000,
  });

  const conversation = useQuery({
    queryKey: ["conversation", selected],
    queryFn: () => fetchConversation({ data: { conversationId: selected! } }),
    enabled: !!selected,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (selected) markRead({ data: { conversationId: selected } }).catch(() => {});
  }, [selected]);

  const rows = conversations.data ?? [];

  if (!rows.length) {
    return <EmptyState icon={<MessageSquare size={30}/>} title="No messages yet">
      Start a conversation from a property page using “Message owner”.
    </EmptyState>;
  }

  const active = conversation.data;

  return <div className="chat-layout">
    <div className="chat-conversations">
      {rows.map(c => {
        const other = c.buyer.id === user?.id ? c.participant : c.buyer;
        const unread = !!c.lastMessage && c.lastMessage.senderId !== user?.id && !c.lastMessage.readAt;
        return <button
          type="button"
          key={c.id}
          className={`chat-conversation ${selected === c.id ? "active" : ""}`}
          onClick={() => setSelected(c.id)}
        >
          <span className="chat-avatar" aria-hidden="true">{other.name?.trim()?.charAt(0)?.toUpperCase() || <UserRound size={15}/>}</span>
          <span className="chat-conversation-copy">
            <span className="chat-conversation-top"><strong>{other.name || "HouseProvider user"}</strong>{unread && <i aria-label="Unread"/>}</span>
            <small>{c.property.title}</small>
            {c.lastMessage && <small className="chat-preview">{c.lastMessage.body}</small>}
          </span>
        </button>;
      })}
    </div>

    <div className="chat-window">
      {!active ? (
        <div className="chat-empty"><MessageSquare size={28}/><p>Select a conversation</p></div>
      ) : <>
        <div className="chat-header">
          <strong>{active.property.title}</strong>
          <small>{active.property.locality}, {active.property.city}</small>
        </div>

        <div className="chat-messages">
          {active.messages.map(m => {
            const mine = m.senderId === user?.id;
            return <div key={m.id} className={`chat-message ${mine ? "mine" : "theirs"}`}>
              <span>{m.body}</span>
              <small>{when(m.createdAt)}</small>
            </div>;
          })}
        </div>

        <form className="chat-compose" onSubmit={async e => {
          e.preventDefault();
          if (!selected || !body.trim() || busy) return;
          setBusy(true);
          try {
            const r = await send({ data: { conversationId: selected, body: body.trim() } });
            if (!r.ok) toast.error(r.message);
            else {
              setBody("");
              await conversation.refetch();
              await conversations.refetch();
            }
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn’t send message.");
          } finally {
            setBusy(false);
          }
        }}>
          <textarea
            value={body}
            maxLength={2000}
            onChange={e => setBody(e.target.value)}
            placeholder="Write a message..."
            rows={2}
          />
          <Button type="submit" disabled={busy || !body.trim()}>
            <Send size={16}/> Send
          </Button>
        </form>
      </>}
    </div>
  </div>;
}

function getCurrentConversationUserId(
  conversation: { buyer: { id: string }; participant: { id: string } },
  _rows: unknown[],
) {
  return conversation.buyer.id;
}
export const OwnerVisitsIcon = CalendarCheck;
