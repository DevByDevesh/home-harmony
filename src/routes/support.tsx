import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
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

  return <main className="wrap account-page">
    <p className="kicker">CUSTOMER CARE</p>
    <h1>How can we help?</h1>
    <p className="form-hint">Customer care is separate from property-owner contact. Use this page for HouseProvider account, listing, payment, abuse or technical issues.</p>

    <section className="dash-panel" aria-labelledby="support-contact">
      <p className="kicker">OFFICIAL SUPPORT</p>
      <h2 id="support-contact">HouseProvider Customer Care</h2>
      <p>For urgent or general help, contact HouseProvider directly. These contacts are not property-owner contacts.</p>
      <div className="account-actions">
        <Button asChild variant="outline"><a href={`mailto:${SUPPORT_EMAIL}?subject=HouseProvider%20Customer%20Support`}>Email Support</a></Button>
        {supportPhone ? <Button asChild><a href={`tel:+${supportPhone.replace(/\D/g, "")}`}>Call Customer Care</a></Button> : <Button variant="outline" disabled>Call Customer Care — number not configured</Button>}
        {supportPhone ? <Button asChild variant="outline"><a href={`https://wa.me/${supportPhone.replace(/\D/g, "")}`}>WhatsApp Customer Care</a></Button> : <Button variant="outline" disabled>WhatsApp Customer Care — number not configured</Button>}
      </div>
      <p className="form-hint">Official support email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
    </section>

    <section className="dash-panel" aria-labelledby="raise-ticket">
      <p className="kicker">SUPPORT TICKETS</p>
      <h2 id="raise-ticket">Raise a Support Ticket</h2>
      <form onSubmit={submit} className="account-form">
        <label>Category<select value={category} onChange={e => setCategory(e.target.value as typeof category)}>{SUPPORT_CATEGORIES.map(x => <option key={x}>{x.replaceAll("_", " ")}</option>)}</select></label>
        <label>Priority<select value={priority} onChange={e => setPriority(e.target.value as typeof priority)}>{SUPPORT_PRIORITIES.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} minLength={3} maxLength={160} required placeholder="What do you need help with?"/></label>
        <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} minLength={10} maxLength={10000} required rows={7} placeholder="Describe the problem and any useful details."/></label>
        <label>Attachments<input type="file" multiple onChange={e => void onFiles(e.target.files)}/><small>Up to 3 files, 1.5 MB each.</small></label>
        {attachments.length > 0 && <p className="form-hint">{attachments.map(x => x.name).join(", ")}</p>}
        <Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Raise Support Ticket"}</Button>
        {message && <p role={message.includes("successfully") ? "status" : "alert"} className="form-hint">{message}</p>}
      </form>
    </section>

    <section className="dash-panel" aria-labelledby="my-tickets">
      <p className="kicker">YOUR TICKETS</p>
      <h2 id="my-tickets">Support history</h2>
      {tickets.isPending ? <p>Loading…</p> : tickets.isError ? <p role="alert">{(tickets.error as Error).message}</p> : tickets.data.length === 0 ? <p>No support tickets yet.</p> :
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{tickets.data.map(t => <tr key={t.id}><td>{t.subject}</td><td>{t.category}</td><td>{t.priority}</td><td>{t.status.replaceAll("_", " ")}</td><td>{new Date(t.createdAt).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
