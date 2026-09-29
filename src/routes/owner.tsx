import { guardArea } from "@/lib/auth/route-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Archive, BarChart3, CalendarCheck, CheckCircle2, Eye, LayoutDashboard, Pause, Pencil, Play, Plus, RotateCcw, Send, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PropertyDetailView } from "@/components/property-detail-view";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DemoLabel, LocalEventsCard, MetricGrid, TrendCard } from "@/components/analytics-kit";
import { EmptyState } from "@/components/empty-state";
import { ListingStatusPill, RoleSwitcher } from "@/components/role-switcher";
import { VerificationPanel } from "@/components/verification-panel";
import type { ListingStatus } from "@/lib/catalog";
import { inr } from "@/lib/catalog";
import { demoSeries, rate, total } from "@/lib/analytics";
import { timeAgo } from "@/lib/local-store";
import { draftToHome, freshness, ownerActions, useOwnerData, type OwnerListing } from "@/lib/owner-data";
import { formatVisitDate, statusLabel, visitTransitions } from "@/lib/visits";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyListingsFn, setMyListingStatusFn, type OwnerDbListing } from "@/lib/owner-listings.functions";
import { toListing } from "@/lib/property-mapper";

const tabs = [["overview", "Overview", LayoutDashboard], ["listings", "Listings", ShieldCheck], ["enquiries", "Enquiries", Send], ["visits", "Visits", CalendarCheck], ["analytics", "Analytics", BarChart3], ["verification", "Verification", CheckCircle2], ["profile", "Profile", User]] as const;
const statusGroups: (ListingStatus | "ARCHIVED" | "ALL")[] = ["ALL", "ACTIVE", "PAUSED", "UNDER_REVIEW", "RENTED", "SOLD", "EXPIRED", "ARCHIVED"];

export const Route = createFileRoute("/owner")({
  beforeLoad: guardArea("owner"),
  validateSearch: z.object({ tab: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Owner dashboard — HouseProvider.in" },
    { name: "description", content: "Manage your listings, visit requests, verification and listing performance on HouseProvider.in." },
    { property: "og:title", content: "Owner dashboard — HouseProvider.in" },
    { property: "og:description", content: "Listings, visits, verification and analytics for property owners." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: OwnerDashboard,
});

function OwnerDashboard() {
  const { tab = "overview" } = Route.useSearch();
  const active = tabs.find(t => t[0] === tab) ?? tabs[0];
  const { ready } = useOwnerData();
  return <main className="dashboard-page"><div className="wrap">
    <div className="results-intro dash-intro"><div><p className="kicker">OWNER SPACE</p><h1>Your <em>properties.</em></h1></div><Button asChild><Link to="/owner/new"><Plus size={16}/> New listing</Link></Button></div>
    <RoleSwitcher/>
    <div className="demo-banner" role="note"><strong>Demo owner dashboard.</strong> Sample listings, visits and numbers are fictional and stored on this device. Sign-in, real enquiries and moderation arrive with the backend.</div>
    <div className="dashboard-layout">
      <nav className="dash-nav" aria-label="Owner sections">{tabs.map(([id, label, Icon]) => <Link key={id} to="/owner" search={{ tab: id }} aria-current={active[0] === id ? "page" : undefined}><Icon size={16}/>{label}</Link>)}</nav>
       <section className="dash-panel" aria-labelledby="owner-title"><h2 id="owner-title">{active[1]}</h2><div key={active[0]} className="panel-entrance">{ready ? <Panel id={active[0]}/> : <div className="tile-skeleton" aria-busy="true"><span/><span/><span/></div>}</div></section>
    </div>
  </div></main>;
}

function useTotals(listings: OwnerListing[]) {
  const live = listings.filter(l => !l.archived);
  const sum = (k: keyof OwnerListing["metrics"]) => live.reduce((n, l) => n + l.metrics[k], 0);
  return { active: live.filter(l => l.status === "ACTIVE").length, views: sum("views"), saves: sum("saves"), enquiries: sum("enquiries"), visits: sum("visits") };
}
function Charts() {
  const { data } = useOwnerData();
  const perf = data.listings.filter(l => !l.archived).map(l => ({ label: (l.draft.title || l.draft.locality).slice(0, 14), value: l.metrics.views }));
  return <div className="chart-grid"><TrendCard title="Views over time" data={demoSeries(3, 14, 18, 16)}/><TrendCard title="Enquiries over time" data={demoSeries(7, 14, 1, 4)} kind="bar"/><TrendCard title="Saves over time" data={demoSeries(11, 14, 2, 5)}/><TrendCard title="Listing performance (views)" data={perf} kind="bar"/></div>;
}

function Panel({ id }: { id: string }) {
  const { data } = useOwnerData();
  const t = useTotals(data.listings);
  const newListing = <Button asChild><Link to="/owner/new"><Plus size={16}/> Create a listing</Link></Button>;
  switch (id) {
    case "listings": return <ListingsPanel/>;
    case "enquiries": return <EmptyState icon={<Send size={30}/>} title="No enquiries yet">Enquiries from seekers will appear here once messaging and accounts are connected. No seeker has contacted you through this demo.</EmptyState>;
    case "visits": return data.visits.length ? <><DemoLabel>Sample visit requests from fictional visitors. Your choice is saved here; no one is notified.</DemoLabel><ul className="dash-list">{data.visits.map(v => { const l = data.listings.find(x => x.id === v.listingId); return <li key={v.id}><div><strong>{v.visitor} · {l ? draftToHome(l.draft).name : "Removed listing"}</strong><small>{formatVisitDate(v.date)} at {v.slot}</small><span className={`status status-${v.status.toLowerCase()}`}>{statusLabel[v.status]}</span></div><div className="dash-row-actions">{visitTransitions[v.status].map(s => <Button key={s} size="sm" variant={s === "CONFIRMED" ? "default" : "outline"} onClick={() => { ownerActions.setVisitStatus(v.id, s); toast.success(`Marked ${statusLabel[s].toLowerCase()} (demo)`); }}>{s === "CONFIRMED" ? "Accept" : s === "CANCELLED" ? "Decline" : s === "RESCHEDULED" ? "Reschedule" : statusLabel[s]}</Button>)}</div></li>; })}</ul></> : <EmptyState icon={<CalendarCheck size={30}/>} title="No visit requests">Visit requests for your listings will appear here.</EmptyState>;
    case "analytics": return <><DemoLabel/><MetricGrid items={[{ label: "Total views", value: t.views }, { label: "Saves", value: t.saves }, { label: "Enquiries", value: t.enquiries }, { label: "Visits", value: t.visits }, { label: "Save rate", value: rate(t.saves, t.views) }, { label: "Visit conversion", value: rate(t.visits, t.views) }]}/><Charts/><LocalEventsCard types={["LISTING_CREATED", "LISTING_PUBLISHED"]}/></>;
    case "verification": { const items = data.listings.filter(l => !l.archived); return items.length ? <div className="verify-list">{items.map(l => <div key={l.id}><h3>{draftToHome(l.draft).name} <ListingStatusPill status={l.status}/></h3><VerificationPanel record={l.verification} compact onRequest={keys => { ownerActions.requestVerification(l.id, keys); toast.success("Checks requested — pending review"); }}/></div>)}</div> : <EmptyState icon={<ShieldCheck size={30}/>} title="No verification requests" action={newListing}>Create a listing to request verification checks.</EmptyState>; }
    case "profile": return <div className="profile-card"><p><strong>Owner profile</strong></p><p>Sign-in with email, phone OTP or Google will create your owner profile. Until then this dashboard runs in demo mode on this device.</p><Button variant="outline" onClick={() => { ownerActions.reset(); toast("Owner demo data reset"); }}><RotateCcw size={15}/> Reset owner demo data</Button></div>;
    default: return <>
      <DemoLabel/>
      <MetricGrid items={[{ label: "Active listings", value: t.active, hint: "From your listings" }, { label: "Total views", value: t.views }, { label: "Saves", value: t.saves }, { label: "Enquiries", value: t.enquiries }, { label: "Visits", value: t.visits }, { label: "Conversion", value: rate(t.visits, t.views), hint: "Visits ÷ views" }]}/>
      <Charts/>
      <p className="form-hint">Chart totals are illustrative ({total(demoSeries(3, 14, 18, 16))} demo views over 14 days).</p>
    </>;
  }
}

function ListingsPanel() {
  const { data } = useOwnerData();
  const [group, setGroup] = useState<(typeof statusGroups)[number]>("ALL");
  const count = (g: (typeof statusGroups)[number]) => data.listings.filter(l => g === "ALL" ? !l.archived : g === "ARCHIVED" ? l.archived : !l.archived && l.status === g).length;
  const items = data.listings.filter(l => group === "ALL" ? !l.archived : group === "ARCHIVED" ? l.archived : !l.archived && l.status === group);
  const fetchMine = useServerFn(listMyListingsFn);
  const db = useQuery({ queryKey: ["owner-db-listings"], queryFn: () => fetchMine() }).data ?? [];
  const dbItems = db.filter(p => group === "ALL" || p.status === group);
  const dbCount = (g: (typeof statusGroups)[number]) => g === "ARCHIVED" ? 0 : db.filter(p => g === "ALL" || p.status === g).length;
  return <>
    {data.draft && !data.editingId && <div className="draft-note"><span>You have an unfinished draft{data.draftSavedAt ? ` · saved ${timeAgo(data.draftSavedAt)}` : ""}.</span><Button asChild size="sm" variant="outline"><Link to="/owner/new">Resume draft</Link></Button></div>}
    <div className="seg-tabs" role="tablist" aria-label="Filter by status">{statusGroups.map(g => <button key={g} role="tab" aria-selected={group === g} onClick={() => setGroup(g)}>{g.replace("_", " ").toLowerCase()} <small>{count(g) + dbCount(g)}</small></button>)}</div>
    {items.length + dbItems.length === 0 ? <EmptyState icon={<ShieldCheck size={30}/>} title="No listings yet" action={<Button asChild><Link to="/owner/new"><Plus size={16}/> Create a listing</Link></Button>}>{group === "ALL" ? "Create your first listing in nine guided steps." : "Nothing in this status right now."}</EmptyState> :
    <ul className="owner-listings">{dbItems.map(p => <DbListingRow key={p.id} listing={p}/>)}{items.map(l => { const h = draftToHome(l.draft, l.id); return <li key={l.id}>
      <img src={h.image} alt="" loading="lazy"/>
      <div className="ol-body"><div className="ol-title"><strong>{h.name}</strong><ListingStatusPill status={l.status}/>{l.demo && <span className="demo-chip">Sample</span>}</div>
        <small>{h.neighborhood}, {h.city} · {inr(h.price)}{h.mode === "Rent" ? " / month" : ""} · {h.beds} BHK · {h.area.toLocaleString("en-IN")} sq.ft.</small>
        <small className="ol-fresh">{freshness(l)} · Updated {timeAgo(l.updatedAt)} · Not verified</small>
        <div className="ol-stats"><span><Eye size={13}/>{l.metrics.views}</span><span>{l.metrics.saves} saves</span><span>{l.metrics.enquiries} enquiries</span></div></div>
      <div className="ol-actions">
        <ViewListing listing={l}/><Button asChild size="sm" variant="outline"><Link to="/owner/new" search={{ edit: l.id }}><Pencil size={14}/> Edit</Link></Button>
        {l.archived ? <Button size="sm" variant="outline" onClick={() => { ownerActions.restore(l.id); toast.success("Listing restored"); }}><RotateCcw size={14}/> Restore</Button> : <>
          {l.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => { ownerActions.setStatus(l.id, "PAUSED"); toast.success("Listing paused"); }}><Pause size={14}/> Pause</Button>}
          {l.status === "PAUSED" && <Button size="sm" variant="outline" onClick={() => { ownerActions.setStatus(l.id, "ACTIVE"); toast.success("Listing resumed (demo)"); }}><Play size={14}/> Resume</Button>}
          {(l.status === "ACTIVE" || l.status === "PAUSED") && <Button size="sm" variant="outline" onClick={() => { ownerActions.confirmAvailability(l.id); toast.success("Availability confirmed — freshness updated"); }}><CheckCircle2 size={14}/> Confirm availability</Button>}
          {l.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => { ownerActions.setStatus(l.id, l.draft.mode === "Rent" ? "RENTED" : "SOLD"); toast.success(`Marked ${l.draft.mode === "Rent" ? "rented" : "sold"}`); }}>Mark {l.draft.mode === "Rent" ? "rented" : "sold"}</Button>}
          <Button size="sm" variant="ghost" onClick={() => { ownerActions.archive(l.id); toast("Listing archived", { action: { label: "Undo", onClick: () => ownerActions.restore(l.id) } }); }}><Archive size={14}/> Archive</Button></>}
      </div></li>; })}</ul>}
  </>;
}

function ViewListing({ listing }: { listing: OwnerListing }) {
  const h = draftToHome(listing.draft, listing.id);
  return <Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><Eye size={14}/> View</Button></DialogTrigger>
    <DialogContent className="listing-view-dialog"><DialogTitle className="sr-only">{h.name}</DialogTitle><DialogDescription className="sr-only">Preview of how seekers would see this listing.</DialogDescription>
      <div className="detail-page preview-detail"><PropertyDetailView home={h} imageNote="Owner photo preview" disclaimer="Owner preview. Only listings approved by moderation are visible to seekers." aside={<div className="detail-summary"><p className="kicker">STATUS</p><h3><ListingStatusPill status={listing.status}/></h3><div><span>Deposit</span><strong>{inr(Number(listing.draft.deposit) || 0)}</strong></div><div><span>Availability</span><strong>{freshness(listing)}</strong></div><div><span>Updated</span><strong>{timeAgo(listing.updatedAt)}</strong></div><VerificationPanel record={listing.verification} compact/></div>}/></div>
    </DialogContent></Dialog>;
}

function DbListingRow({ listing }: { listing: OwnerDbListing }) {
  const h = toListing(listing);
  const status = listing.status as ListingStatus;
  const qc = useQueryClient();
  const setStatus = useServerFn(setMyListingStatusFn);
  const change = async (to: "ACTIVE" | "PAUSED") => {
    try { await setStatus({ data: { id: listing.id, status: to } }); await qc.invalidateQueries({ queryKey: ["owner-db-listings"] }); toast.success(to === "PAUSED" ? "Listing paused" : "Listing resumed"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not update this listing."); }
  };
  return <li>
    <img src={h.image} alt="" loading="lazy"/>
    <div className="ol-body"><div className="ol-title"><strong>{h.name}</strong><ListingStatusPill status={status}/></div>
      <small>{h.neighborhood}, {h.city} · {inr(h.price)}{h.mode === "Rent" ? " / month" : ""} · {h.beds} BHK · {h.area.toLocaleString("en-IN")} sq.ft.</small></div>
    <div className="dash-row-actions">
      <Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><Eye size={14}/> View</Button></DialogTrigger>
        <DialogContent className="listing-view-dialog"><DialogTitle className="sr-only">{h.name}</DialogTitle><DialogDescription className="sr-only">Preview of this listing.</DialogDescription>
          <div className="detail-page preview-detail"><PropertyDetailView home={h} imageNote="Illustrative image" disclaimer="Owner preview. Verification is not implied." aside={<div className="detail-summary"><p className="kicker">STATUS</p><h3><ListingStatusPill status={status}/></h3><div><span>Deposit</span><strong>{inr(h.deposit)}</strong></div><div><span>Verification</span><strong>Not verified</strong></div></div>}/></div>
        </DialogContent></Dialog>
      <Button size="sm" variant="outline" disabled title="Editing saved listings arrives with the listing wizard update"><Pencil size={14}/> Edit</Button>
      {status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => change("PAUSED")}><Pause size={14}/> Pause</Button>}
      {status === "PAUSED" && <Button size="sm" variant="outline" onClick={() => change("ACTIVE")}><Play size={14}/> Resume</Button>}
    </div></li>;
}
