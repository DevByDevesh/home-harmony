import { guardListingAccess } from "@/lib/auth/route-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Archive, BarChart3, CalendarCheck, CheckCircle2, Eye, LayoutDashboard, MessageCircle, Pause, Pencil, Phone, Play, Plus, RotateCcw, Save, Send, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PropertyDetailView } from "@/components/property-detail-view";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LocalEventsCard, MetricGrid, TrendCard } from "@/components/analytics-kit";
import { EmptyState } from "@/components/empty-state";
import { ListingStatusPill, RoleSwitcher } from "@/components/role-switcher";
import { VerificationPanel } from "@/components/verification-panel";
import type { ListingStatus } from "@/lib/catalog";
import { inr } from "@/lib/catalog";
import { dailyCounts } from "@/lib/analytics";
import { timeAgo } from "@/lib/local-store";
import { draftToHome, freshness, ownerActions, useOwnerData, type OwnerListing } from "@/lib/owner-data";
import { formatVisitDate, statusLabel, visitTransitions } from "@/lib/visits";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyListingsFn, setMyListingStatusFn, setMyListingArchiveFn, repostMyExpiredListingFn, type OwnerDbListing } from "@/lib/owner-listings.functions";
import { listOwnerEnquiriesFn, listOwnerVisitsFn } from "@/lib/engagement.functions";
import { getMyOwnerContactFn, updateMyOwnerContactFn, type OwnerContactProfile } from "@/lib/owner-profile.functions";
import { toListing } from "@/lib/property-mapper";
import { OwnerContactRequests, OwnerDbEnquiries, OwnerDbVisits } from "@/components/engagement";

const tabs = [["overview", "Overview", LayoutDashboard], ["listings", "Listings", ShieldCheck], ["enquiries", "Enquiries", Send], ["visits", "Visits", CalendarCheck], ["analytics", "Analytics", BarChart3], ["verification", "Verification", CheckCircle2], ["profile", "Profile", User]] as const;
const statusGroups: (ListingStatus | "ALL")[] = ["ALL", "DRAFT", "UNDER_REVIEW", "ACTIVE", "REJECTED", "SUSPENDED", "EXPIRED", "ARCHIVED"];

export const Route = createFileRoute("/owner")({
  beforeLoad: guardListingAccess(),
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
    <div className="dashboard-layout">
      <nav className="dash-nav" aria-label="Owner sections">{tabs.map(([id, label, Icon]) => <Link key={id} to="/owner" search={{ tab: id }} aria-current={active[0] === id ? "page" : undefined}><Icon size={16}/>{label}</Link>)}</nav>
       <section className="dash-panel" aria-labelledby="owner-title"><h2 id="owner-title">{active[1]}</h2><div key={active[0]} className="panel-entrance">{ready ? <Panel id={active[0]}/> : <div className="tile-skeleton" aria-busy="true"><span/><span/><span/></div>}</div></section>
    </div>
  </div></main>;
}

function useOwnerLiveStats() {
  const fetchListings = useServerFn(listMyListingsFn);
  const fetchVisits = useServerFn(listOwnerVisitsFn);
  const fetchEnquiries = useServerFn(listOwnerEnquiriesFn);
  const listings = useQuery({ queryKey: ["owner-db-listings"], queryFn: () => fetchListings() });
  const visits = useQuery({ queryKey: ["owner-db-visits"], queryFn: () => fetchVisits() });
  const enquiries = useQuery({ queryKey: ["owner-db-enquiries"], queryFn: () => fetchEnquiries() });
  return { listings, visits, enquiries };
}

/** Real stats from the owner's database records. Views and saves aren't tracked server-side, so they aren't shown. */
function OwnerLiveStats({ events = false }: { events?: boolean }) {
  const { listings, visits, enquiries } = useOwnerLiveStats();
  if (listings.isPending || visits.isPending || enquiries.isPending) return <p className="chart-empty">Loading your records…</p>;
  if (listings.isError) return <p role="alert">{(listings.error as Error).message}</p>;
  if (visits.isError || enquiries.isError) return <p role="alert">Your visits or enquiries couldn’t be loaded.</p>;
  const ls = listings.data ?? [];
  return <>
    <MetricGrid items={[
      { label: "Listings", value: ls.length, hint: "All statuses" },
      { label: "Active listings", value: ls.filter(l => l.status === "ACTIVE").length },
      { label: "In review", value: ls.filter(l => l.status === "UNDER_REVIEW").length },
      { label: "Visit requests", value: visits.data?.length ?? 0 },
      { label: "Enquiries", value: enquiries.data?.length ?? 0 },
    ]}/>
    <div className="chart-grid">
      <TrendCard title="Visit requests (30 days)" data={dailyCounts((visits.data ?? []).map(v => ({ createdAt: v.createdAt })))}/>
      <TrendCard title="Enquiries (30 days)" data={dailyCounts((enquiries.data ?? []).map(e => ({ createdAt: e.createdAt })))} kind="bar"/>
    </div>
    <p className="form-hint">Every number shown here comes from records in your HouseProvider account. Listing views and saves are not tracked yet, so they are not included.</p>
    {events && <LocalEventsCard types={["LISTING_CREATED", "LISTING_PUBLISHED"]}/>}
  </>;
}

function Panel({ id }: { id: string }) {
  const { data } = useOwnerData();
  const newListing = <Button asChild><Link to="/owner/new"><Plus size={16}/> Create a listing</Link></Button>;
  switch (id) {
    case "listings": return <ListingsPanel/>;
    case "enquiries": return <><div className="profile-card"><div className="owner-contact-heading"><div><p className="kicker">PRIVATE CONTACT</p><h3>Phone & call requests</h3></div></div><OwnerContactRequests/></div><OwnerDbEnquiries empty={<EmptyState icon={<Send size={30}/>} title="No enquiries yet">Enquiries from seekers about your listings will appear here.</EmptyState>}/></>;
    case "visits": return <OwnerDbVisits/>;
        case "analytics": return <OwnerLiveStats events/>;
    case "verification": { const items = data.listings.filter(l => !l.archived); return items.length ? <div className="verify-list">{items.map(l => <div key={l.id}><h3>{draftToHome(l.draft).name} <ListingStatusPill status={l.status}/></h3><VerificationPanel record={l.verification} compact onRequest={keys => { ownerActions.requestVerification(l.id, keys); toast.success("Checks requested — pending review"); }}/></div>)}</div> : <EmptyState icon={<ShieldCheck size={30}/>} title="No verification requests" action={newListing}>Create a listing to request verification checks.</EmptyState>; }
    case "profile": return <OwnerContactPanel/>;
    default: return <OwnerLiveStats/>;
  }
}

function OwnerContactPanel() {
  const fetchProfile = useServerFn(getMyOwnerContactFn);
  const profile = useQuery({ queryKey: ["owner-contact-profile"], queryFn: () => fetchProfile() });

  if (profile.isPending) return <p className="chart-empty">Loading your contact settings…</p>;
  if (profile.isError) return <p role="alert">{(profile.error as Error).message}</p>;
  return <OwnerContactForm profile={profile.data} onSaved={() => profile.refetch()}/>;
}

function OwnerContactForm({
  profile,
  onSaved,
}: {
  profile: OwnerContactProfile;
  onSaved: () => Promise<unknown>;
}) {
  const save = useServerFn(updateMyOwnerContactFn);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [preferredContact, setPreferredContact] = useState<OwnerContactProfile["preferredContact"]>(profile.preferredContact);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await save({ data: { phone, preferredContact } });
      if (!result.ok) {
        toast.error("Couldn’t save contact settings.");
        return;
      }
      await onSaved();
      toast.success("Contact settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t save contact settings.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="profile-card owner-contact-card">
    <div className="owner-contact-heading"><div><p className="kicker">PRIVATE CONTACT</p><h3>Owner contact settings</h3></div><span className="owner-contact-badge">Optional</span></div>
    <p>Your phone number is kept private. It is revealed to a seeker only after you explicitly accept a phone or call request.</p>
    <label className="owner-contact-field">Phone number
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="+91 98765 43210"
        maxLength={32}
      />
    </label>
    <label className="owner-contact-field">Preferred contact
      <select className="filter-select" value={preferredContact ?? ""} onChange={e => setPreferredContact((e.target.value || null) as OwnerContactProfile["preferredContact"])}>
        <option value="">No direct contact</option>
        <option value="CALL">Call</option>
        <option value="WHATSAPP">WhatsApp</option>
        <option value="BOTH">Call + WhatsApp</option>
      </select>
    </label>
    <div className="owner-contact-hint"><Phone size={15}/><span>Call</span><MessageCircle size={15}/><span>WhatsApp</span><p>This number is never included in public listing or search data. You control every contact request from the Enquiries section.</p></div>
    <div className="owner-contact-actions">
      <Button disabled={busy} onClick={submit}><Save size={15}/>{busy ? "Saving…" : "Save contact settings"}</Button>
      <Button variant="outline" disabled={busy} onClick={() => { setPhone(profile.phone ?? ""); setPreferredContact(profile.preferredContact); }}><RotateCcw size={15}/> Reset</Button>
    </div>
  </div>;
}

function ListingsPanel() {
  const { data } = useOwnerData();
  const [group, setGroup] = useState<(typeof statusGroups)[number]>("ALL");
  const count = (g: (typeof statusGroups)[number]) => data.listings.filter(l => g === "ALL" ? !l.archived : g === "ARCHIVED" ? l.archived : !l.archived && l.status === g).length;
  const items = data.listings.filter(l => group === "ALL" ? !l.archived : group === "ARCHIVED" ? l.archived : !l.archived && l.status === group);
  const fetchMine = useServerFn(listMyListingsFn);
  const db = useQuery({ queryKey: ["owner-db-listings"], queryFn: () => fetchMine() }).data ?? [];
  const dbItems = db.filter(p => group === "ALL" ? p.status !== "ARCHIVED" : group === "ARCHIVED" ? p.status === "ARCHIVED" : p.status === group);
  const dbCount = (g: (typeof statusGroups)[number]) => g === "ALL"
    ? db.filter(p => p.status !== "ARCHIVED").length
    : g === "ARCHIVED"
      ? db.filter(p => p.status === "ARCHIVED").length
      : db.filter(p => p.status === g).length;
  const discardDraft = () => {
    if (!window.confirm("Delete this unfinished draft? This cannot be undone.")) return;
    ownerActions.discardDraft();
    toast.success("Draft deleted");
  };
  return <>
    <div className="listing-panel-actions">
      <p className="form-hint">Manage your listings and drafts from here.</p>
      <Button asChild><Link to="/owner/new"><Plus size={16}/> Add listing</Link></Button>
    </div>
    {data.draft && !data.editingId && <div className="draft-note"><span>You have an unfinished draft{data.draftSavedAt ? ` · saved ${timeAgo(data.draftSavedAt)}` : ""}.</span><div className="draft-note-actions"><Button asChild size="sm" variant="outline"><Link to="/owner/new">Resume draft</Link></Button><Button size="sm" variant="ghost" onClick={discardDraft}>Delete draft</Button></div></div>}
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
          {l.status === "PAUSED" && <Button size="sm" variant="outline" onClick={() => { ownerActions.setStatus(l.id, "ACTIVE"); toast.success("Listing resumed"); }}><Play size={14}/> Resume</Button>}
          {l.status === "SUSPENDED" && <span className="form-hint">Suspended by admin</span>}
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
  const setArchive = useServerFn(setMyListingArchiveFn);
  const repost = useServerFn(repostMyExpiredListingFn);
  const change = async (to: "ACTIVE" | "PAUSED") => {
    try { const r = await setStatus({ data: { id: listing.id, status: to } }); if (!r.ok) { toast.error(r.message); return; } await qc.invalidateQueries({ queryKey: ["owner-db-listings"] }); toast.success(to === "PAUSED" ? "Listing paused" : "Listing resumed"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not update this listing."); }
  };
  const archive = async () => {
    if (!window.confirm("Delete this listing from your active listings? It will be moved to Archived and its history will be preserved.")) return;
    try {
      const r = await setArchive({ data: { id: listing.id, archived: true } });
      if (!r.ok) { toast.error(r.message); return; }
      await qc.invalidateQueries({ queryKey: ["owner-db-listings"] });
      toast.success("Listing archived");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not archive this listing."); }
  };
  const repostExpired = async () => {
    if (!window.confirm("Repost this expired listing? Its details and images will be preserved, and it will go through verification again.")) return;
    try {
      const r = await repost({ data: { id: listing.id } });
      if (!r.ok) { toast.error(r.message); return; }
      await qc.invalidateQueries({ queryKey: ["owner-db-listings"] });
      toast.success("Listing reposted for a fresh 30-day validity period.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not repost this listing."); }
  };
  const restore = async () => {
    try {
      const r = await setArchive({ data: { id: listing.id, archived: false } });
      if (!r.ok) { toast.error(r.message); return; }
      await qc.invalidateQueries({ queryKey: ["owner-db-listings"] });
      toast.success("Listing restored to review");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not restore this listing."); }
  };
  return <li>
    <img src={h.image} alt="" loading="lazy"/>
    <div className="ol-body"><div className="ol-title"><strong>{h.name}</strong><ListingStatusPill status={status}/></div>
      <small>{h.neighborhood}, {h.city} · {inr(h.price)}{h.mode === "Rent" ? " / month" : ""} · {h.beds} BHK · {h.area.toLocaleString("en-IN")} sq.ft.</small></div>
    <div className="ol-actions">
      <Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><Eye size={14}/> View</Button></DialogTrigger>
        <DialogContent className="listing-view-dialog"><DialogTitle className="sr-only">{h.name}</DialogTitle><DialogDescription className="sr-only">Preview of this listing.</DialogDescription>
          <div className="detail-page preview-detail"><PropertyDetailView home={h} imageNote="Property image" disclaimer="Owner preview. Verification status is shown separately." aside={<div className="detail-summary"><p className="kicker">STATUS</p><h3><ListingStatusPill status={status}/></h3><div><span>Deposit</span><strong>{inr(h.deposit)}</strong></div><div><span>Verification</span><strong>Not verified</strong></div></div>}/></div>
        </DialogContent></Dialog>
      <Button asChild size="sm" variant="outline"><Link to="/owner/new" search={{ dbEdit: listing.id }}><Pencil size={14}/> Edit</Link></Button>
      {listing.status === "ARCHIVED" ? <Button size="sm" variant="outline" onClick={restore}><RotateCcw size={14}/> Restore</Button> : listing.status === "EXPIRED" ? <Button size="sm" variant="outline" onClick={repostExpired}><RotateCcw size={14}/> Repost</Button> : <>
        {status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => change("PAUSED")}><Pause size={14}/> Pause</Button>}
        {status === "SUSPENDED" && <span className="form-hint">Suspended by admin</span>}
        {status === "PAUSED" && <Button size="sm" variant="outline" onClick={() => change("ACTIVE")}><Play size={14}/> Resume</Button>}
        <Button size="sm" variant="ghost" onClick={archive}><Archive size={14}/> Delete</Button>
      </>}
    </div></li>;
}




