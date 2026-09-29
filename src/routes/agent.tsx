import { guardArea } from "@/lib/auth/route-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { BarChart3, Building2, CalendarClock, CalendarCheck, ChevronLeft, ChevronRight, CreditCard, MessageSquare, UserCheck, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DemoLabel, LocalEventsCard, MetricGrid, TrendCard } from "@/components/analytics-kit";
import { EmptyState } from "@/components/empty-state";
import { HomeTile } from "@/components/home-tile";
import { RoleSwitcher } from "@/components/role-switcher";
import { getListing, listings } from "@/lib/catalog";
import { demoSeries, rate } from "@/lib/analytics";
import { agentActions, leadLabel, leadStatuses, useAgentData, type Lead, type LeadStatus } from "@/lib/agent-data";

const tabs = [["leads", "Leads", Users], ["listings", "Listings", Building2], ["clients", "Clients", UserCheck], ["visits", "Visits", CalendarCheck], ["followups", "Follow-ups", CalendarClock], ["messages", "Messages", MessageSquare], ["analytics", "Analytics", BarChart3], ["team", "Team", UsersRound], ["subscription", "Subscription", CreditCard]] as const;

export const Route = createFileRoute("/agent")({
  beforeLoad: guardArea("agent"),
  validateSearch: z.object({ tab: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Agent CRM — HouseProvider.in" },
    { name: "description", content: "A lead pipeline, follow-ups, visits and performance analytics for property agents on HouseProvider.in." },
    { property: "og:title", content: "Agent CRM — HouseProvider.in" },
    { property: "og:description", content: "Manage leads from first contact to conversion." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: AgentCRM,
});

function AgentCRM() {
  const { tab = "leads" } = Route.useSearch();
  const active = tabs.find(t => t[0] === tab) ?? tabs[0];
  const { ready } = useAgentData();
  const [openId, setOpenId] = useState<string | null>(null);
  return <main className="dashboard-page"><div className="wrap">
    <div className="results-intro"><p className="kicker">AGENT CRM</p><h1>Your <em>pipeline.</em></h1></div>
    <RoleSwitcher/>
    <div className="demo-banner" role="note"><strong>Demo CRM.</strong> Every lead is a fictional placeholder stored on this device. No real contacts are imported, and no one is messaged or called.</div>
    <div className="dashboard-layout">
      <nav className="dash-nav" aria-label="Agent sections">{tabs.map(([id, label, Icon]) => <Link key={id} to="/agent" search={{ tab: id }} aria-current={active[0] === id ? "page" : undefined}><Icon size={16}/>{label}</Link>)}</nav>
       <section className="dash-panel" aria-labelledby="agent-title"><h2 id="agent-title">{active[1]}</h2><div key={active[0]} className="panel-entrance">{ready ? <Panel id={active[0]} open={setOpenId}/> : <div className="tile-skeleton" aria-busy="true"><span/><span/><span/></div>}</div></section>
    </div>
    <LeadSheet id={openId} onClose={() => setOpenId(null)}/>
  </div></main>;
}

const move = (l: Lead, dir: 1 | -1) => { const i = leadStatuses.indexOf(l.status) + dir; const next = leadStatuses[i]; if (next) { agentActions.setStatus(l.id, next); toast.success(`${l.name} → ${leadLabel[next]}`); } };
function LeadCard({ lead, open }: { lead: Lead; open: (id: string) => void }) {
  const home = getListing(lead.propertySlug); const i = leadStatuses.indexOf(lead.status);
  const overdue = lead.nextFollowUp && lead.nextFollowUp < new Date().toISOString().slice(0, 10);
  return <article className="lead-card">
    <button type="button" className="lead-open" onClick={() => open(lead.id)}><strong>{lead.name}</strong><small>{home?.name ?? "Property unavailable"} · {lead.budget}</small>
      {lead.nextFollowUp && <small className={overdue ? "overdue" : ""}>Follow up {overdue ? "overdue · " : ""}{new Date(lead.nextFollowUp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</small>}</button>
    <div className="lead-move"><button type="button" aria-label={`Move ${lead.name} back`} disabled={i === 0} onClick={() => move(lead, -1)}><ChevronLeft size={15}/></button><button type="button" aria-label={`Move ${lead.name} forward`} disabled={i === leadStatuses.length - 1} onClick={() => move(lead, 1)}><ChevronRight size={15}/></button></div>
  </article>;
}
function Pipeline({ open }: { open: (id: string) => void }) {
  const { data } = useAgentData();
  const [mobileStage, setMobileStage] = useState<LeadStatus>("NEW");
  if (!data.leads.length) return <EmptyState icon={<Users size={30}/>} title="No leads yet">Leads from enquiries will appear here once accounts and messaging are connected.</EmptyState>;
  return <>
    <DemoLabel>Fictional demo leads. Move them between stages with the arrows or open a lead for details.</DemoLabel>
    <div className="stage-select" role="tablist" aria-label="Pipeline stage">{leadStatuses.map(s => <button key={s} role="tab" aria-selected={mobileStage === s} onClick={() => setMobileStage(s)}>{leadLabel[s]} <small>{data.leads.filter(l => l.status === s).length}</small></button>)}</div>
    <div className="pipeline">{leadStatuses.map(s => { const items = data.leads.filter(l => l.status === s); return <section key={s} className={`stage stage-${s.toLowerCase()}${mobileStage === s ? " mobile-active" : ""}`} aria-label={`${leadLabel[s]} (${items.length})`}>
      <header><span>{leadLabel[s]}</span><small>{items.length}</small></header>
      {items.length ? items.map(l => <LeadCard key={l.id} lead={l} open={open}/>) : <p className="stage-empty">No leads</p>}</section>; })}</div>
  </>;
}
function LeadList({ leads, open, empty }: { leads: Lead[]; open: (id: string) => void; empty: { title: string; text: string } }) {
  return leads.length ? <ul className="dash-list">{leads.map(l => <li key={l.id}><div><strong>{l.name}</strong><small>{getListing(l.propertySlug)?.name} · {l.location}</small><span className={`lead-pill lead-${l.status.toLowerCase()}`}>{leadLabel[l.status]}</span></div><div className="dash-row-actions"><Button size="sm" variant="outline" onClick={() => open(l.id)}>Open</Button></div></li>)}</ul> : <EmptyState icon={<Users size={30}/>} title={empty.title}>{empty.text}</EmptyState>;
}

function Panel({ id, open }: { id: string; open: (id: string) => void }) {
  const { data } = useAgentData();
  const c = (s: LeadStatus) => data.leads.filter(l => l.status === s).length;
  const today = new Date().toISOString().slice(0, 10);
  switch (id) {
    case "listings": return <><DemoLabel>Showcase homes shown as sample agent listings. They are fictional and unverified.</DemoLabel><div className="home-grid dash-grid">{listings.slice(0, 4).map(h => <HomeTile key={h.slug} home={h}/>)}</div></>;
    case "clients": return <LeadList leads={data.leads.filter(l => ["INTERESTED", "VISIT_SCHEDULED", "NEGOTIATION", "CONVERTED"].includes(l.status))} open={open} empty={{ title: "No clients yet", text: "Leads become clients once they show interest." }}/>;
    case "visits": return <LeadList leads={data.leads.filter(l => l.status === "VISIT_SCHEDULED")} open={open} empty={{ title: "No visits scheduled", text: "Move a lead to “Visit scheduled” to see it here." }}/>;
    case "followups": { const f = data.leads.filter(l => l.nextFollowUp).sort((a, b) => a.nextFollowUp!.localeCompare(b.nextFollowUp!)); return f.length ? <ul className="dash-list">{f.map(l => <li key={l.id}><div><strong>{l.name}</strong><small className={l.nextFollowUp! < today ? "overdue" : ""}>{l.nextFollowUp! < today ? "Overdue · " : l.nextFollowUp === today ? "Today · " : ""}{new Date(l.nextFollowUp!).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</small></div><div className="dash-row-actions"><Button size="sm" variant="outline" onClick={() => open(l.id)}>Open</Button><Button size="sm" variant="ghost" onClick={() => { agentActions.setFollowUp(l.id, null); toast.success("Follow-up done"); }}>Done</Button></div></li>)}</ul> : <EmptyState icon={<CalendarClock size={30}/>} title="No follow-ups">Set a follow-up date on any lead.</EmptyState>; }
    case "messages": return <EmptyState icon={<MessageSquare size={30}/>} title="No messages yet">In-app messaging arrives with accounts. No messages are sent or received in this demo.</EmptyState>;
    case "team": return <EmptyState icon={<UsersRound size={30}/>} title="No team members">Team seats and shared pipelines arrive with organisation accounts.</EmptyState>;
    case "subscription": return <EmptyState icon={<CreditCard size={30}/>} title="No subscription">Agent plans and billing are part of a later phase. You are not being charged.</EmptyState>;
    case "analytics": return <><DemoLabel/><MetricGrid items={[{ label: "Listings", value: 4 }, { label: "Views", value: 1840 }, { label: "Saves", value: 162 }, { label: "Enquiries", value: 47 }, { label: "Visits", value: c("VISIT_SCHEDULED") + 11 }, { label: "Conversions", value: c("CONVERTED"), hint: `${rate(c("CONVERTED"), data.leads.length)} of pipeline` }]}/>
      <div className="chart-grid"><TrendCard title="Views" data={demoSeries(5, 14, 90, 60)}/><TrendCard title="Leads by stage" data={leadStatuses.map(s => ({ label: leadLabel[s].split(" ")[0]!, value: c(s) }))} kind="bar"/><TrendCard title="Visits" data={demoSeries(13, 14, 0, 3)} kind="bar"/><TrendCard title="Conversions" data={demoSeries(17, 14, 0, 2)}/></div>
      <p className="form-hint">“Leads by stage” and “Conversions” in the metrics reflect your demo pipeline; other figures are illustrative.</p><LocalEventsCard types={["PROPERTY_VIEW", "PROPERTY_SAVE", "VISIT_REQUEST"]}/></>;
    default: return <Pipeline open={open}/>;
  }
}

function LeadSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useAgentData();
  const lead = data.leads.find(l => l.id === id);
  const [note, setNote] = useState("");
  const home = lead ? getListing(lead.propertySlug) : undefined;
  return <Sheet open={!!lead} onOpenChange={o => { if (!o) { onClose(); setNote(""); } }}>
    <SheetContent className="lead-sheet">{lead && <>
      <SheetHeader><SheetTitle>{lead.name}</SheetTitle><SheetDescription>Fictional demo lead · no real contact details</SheetDescription></SheetHeader>
      <dl className="lead-facts"><div><dt>Property interest</dt><dd>{home?.name ?? "Unavailable"}</dd></div><div><dt>Budget</dt><dd>{lead.budget}</dd></div><div><dt>Preferred location</dt><dd>{lead.location}</dd></div><div><dt>Last contact</dt><dd>{lead.lastContact ? new Date(lead.lastContact).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Not yet"}</dd></div></dl>
      <label className="field"><span>Status</span><select value={lead.status} onChange={e => { agentActions.setStatus(lead.id, e.target.value as LeadStatus); toast.success(`Status: ${leadLabel[e.target.value as LeadStatus]}`); }}>{leadStatuses.map(s => <option key={s} value={s}>{leadLabel[s]}</option>)}</select></label>
      <label className="field"><span>Next follow-up</span><input type="date" value={lead.nextFollowUp ?? ""} onChange={e => { agentActions.setFollowUp(lead.id, e.target.value || null); toast.success(e.target.value ? "Follow-up set" : "Follow-up cleared"); }}/></label>
      {home && <Button asChild variant="outline" size="sm"><Link to="/property/$slug" params={{ slug: home.slug }}>View interested property</Link></Button>}
      <form className="note-form" onSubmit={e => { e.preventDefault(); if (!note.trim()) { toast.error("Write a note first"); return; } agentActions.addNote(lead.id, note); setNote(""); toast.success("Note added"); }}>
        <label className="field"><span>Add note</span><textarea rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)}/></label><Button type="submit" size="sm">Save note</Button></form>
      <h4 className="notes-title">Notes</h4>{lead.notes.length ? <ul className="notes">{lead.notes.map(n => <li key={n.id}><p>{n.text}</p><small>{new Date(n.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></li>)}</ul> : <p className="form-hint">No notes yet.</p>}
    </>}</SheetContent></Sheet>;
}
