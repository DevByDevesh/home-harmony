import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Headset, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupportTicketFn, listMySupportTicketsFn } from "@/lib/support.functions";
import { SUPPORT_CATEGORIES, SUPPORT_EMAIL, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "@/lib/support";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [
    { title: "Customer Support — HouseProvider.in" },
    { name: "description", content: "HouseProvider customer support for account, listing, payment, abuse and technical issues." },
  ] }),
  component: SupportPage,
});

const supportPhone = import.meta.env["VITE_SUPPORT_PHONE"] as string | undefined;

function SupportPage() {
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["support", "my-tickets"], queryFn: () => listMySupportTicketsFn() });
  const [category, setCategory] = useState<typeof SUPPORT_CATEGORIES[number]>("TECHNICAL");
  const [priority, setPriority] = useState<typeof SUPPORT_PRIORITIES[number]>("MEDIUM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string; size: number; dataUrl: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const next = [...files].slice(0, 3);
    const converted = [];
    for (const file of next) {
      if (file.size > 1_500_000) { setMessage("Each attachment must be 1.5 MB or smaller."); return; }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      converted.push({ name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl });
    }
    setAttachments(converted);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage(null);
    try {
      await createSupportTicketFn({ data: { category, priority, subject, description, attachments } });
      setSubject(""); setDescription(""); setAttachments([]);
      setMessage("Support ticket raised successfully. Our customer care team will review it.");
      await queryClient.invalidateQueries({ queryKey: ["support", "my-tickets"] });
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not raise the support ticket."); }
    finally { setSaving(false); }
  };

  return <main className="wrap support-page">
    <header className="support-intro">
      <span className="support-intro-icon"><Headset size={23}/></span>
      <p className="kicker">CUSTOMER CARE</p>
      <h1>How can we help?</h1>
      <p>Get help with your HouseProvider account, listing, payment, or a technical issue. For property enquiries, contact the owner from the listing.</p>
    </header>

    <div className="support-content-grid">
      <section className="support-panel support-contact-panel" aria-labelledby="support-contact">
        <div className="support-panel-heading">
          <span className="support-panel-icon"><MessageCircle size={19}/></span>
          <div><p className="kicker">OFFICIAL SUPPORT</p><h2 id="support-contact">HouseProvider Customer Care</h2></div>
        </div>
        <p className="support-panel-description">For urgent or general help, contact HouseProvider directly. These contacts are not property-owner contacts.</p>
        <div className="support-contact-actions">
          <Button asChild variant="outline"><a href={`mailto:${SUPPORT_EMAIL}?subject=HouseProvider%20Customer%20Support`}><Mail size={16}/>Email Support</a></Button>
          {supportPhone ? <Button asChild><a href={`tel:+${supportPhone.replace(/\D/g, "")}`}><Phone size={16}/>Call Customer Care</a></Button> : <Button variant="outline" disabled><Phone size={16}/>Call Customer Care — number not configured</Button>}
          {supportPhone ? <Button asChild variant="outline"><a href={`https://wa.me/${supportPhone.replace(/\D/g, "")}`}><MessageCircle size={16}/>WhatsApp Customer Care</a></Button> : <Button variant="outline" disabled><MessageCircle size={16}/>WhatsApp Customer Care — number not configured</Button>}
        </div>
        <p className="support-email-note">Official support email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </section>

      <section className="support-panel support-ticket-panel" aria-labelledby="raise-ticket">
        <div className="support-panel-heading">
          <span className="support-panel-icon"><Send size={19}/></span>
          <div><p className="kicker">SUPPORT TICKETS</p><h2 id="raise-ticket">Raise a Support Ticket</h2></div>
        </div>
        <p className="support-panel-description">Share a few details and our team will follow up through your account.</p>
        <form onSubmit={submit} className="support-ticket-form">
          <label>Category<select value={category} onChange={e => setCategory(e.target.value as typeof category)}>{SUPPORT_CATEGORIES.map(x => <option key={x}>{x.replaceAll("_", " ")}</option>)}</select></label>
          <label>Priority<select value={priority} onChange={e => setPriority(e.target.value as typeof priority)}>{SUPPORT_PRIORITIES.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="support-form-wide">Subject<input value={subject} onChange={e => setSubject(e.target.value)} minLength={3} maxLength={160} required placeholder="What do you need help with?"/></label>
          <label className="support-form-wide">Description<textarea value={description} onChange={e => setDescription(e.target.value)} minLength={10} maxLength={10000} required rows={5} placeholder="Describe the problem and any useful details."/></label>
          <label className="support-attachments support-form-wide">Attachments<input type="file" multiple onChange={e => void onFiles(e.target.files)}/><small>Up to 3 files, 1.5 MB each.</small></label>
          {attachments.length > 0 && <p className="support-attachment-list support-form-wide">{attachments.map(x => x.name).join(", ")}</p>}
          <Button type="submit" disabled={saving} className="support-submit support-form-wide"><Send size={16}/>{saving ? "Submitting…" : "Raise Support Ticket"}</Button>
          {message && <p role={message.includes("successfully") ? "status" : "alert"} className={`support-form-message support-form-wide ${message.includes("successfully") ? "success" : "error"}`}>{message}</p>}
        </form>
      </section>
    </div>

    <section className="support-panel support-history-panel" aria-labelledby="my-tickets">
      <div className="support-panel-heading">
        <span className="support-panel-icon"><Headset size={19}/></span>
        <div><p className="kicker">YOUR TICKETS</p><h2 id="my-tickets">Support history</h2></div>
      </div>
      {tickets.isPending ? <p className="support-history-state">Loading your support history…</p> : tickets.isError ? <p role="alert" className="support-history-state error">{(tickets.error as Error).message}</p> : tickets.data.length === 0 ? <p className="support-history-state">No support tickets yet. Tickets you raise will appear here.</p> :
        <div className="support-history-table-wrap"><table className="admin-table support-history-table"><thead><tr><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{tickets.data.map(t => <tr key={t.id}><td data-label="Subject">{t.subject}</td><td data-label="Category">{t.category.replaceAll("_", " ")}</td><td data-label="Priority">{t.priority}</td><td data-label="Status"><span className={`support-ticket-status status-${t.status.toLowerCase()}`}>{t.status.replaceAll("_", " ")}</span></td><td data-label="Created">{new Date(t.createdAt).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
