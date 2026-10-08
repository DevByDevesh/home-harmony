import { guardArea } from "@/lib/auth/route-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Bell, Bookmark, CalendarCheck, Clock, Eye, GitCompareArrows, Heart, LayoutDashboard, MessageSquare, Send, Settings2, Sparkles, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, TileSkeletons } from "@/components/empty-state";
import { HomeTile } from "@/components/home-tile";
import { SavedSearchCard } from "@/components/saved-search-card";
import { SmartMatches } from "@/components/smart-matches";
import { RoleSwitcher } from "@/components/role-switcher";
import { ChatPanel, MyDbVisits, MyEnquiries, MyNotifications } from "@/components/engagement";
import { cities, getListing } from "@/lib/catalog";
import { useLiveListings } from "@/lib/use-live-listings";
import { userActions, useUserData, type Preferences } from "@/lib/user-data";

const tabs = [
  ["overview", "Overview", LayoutDashboard], ["matches", "Smart matches", Sparkles], ["saved", "Saved properties", Heart], ["searches", "Saved searches", Bookmark],
  ["recent", "Recently viewed", Clock], ["compared", "Compared", GitCompareArrows], ["enquiries", "Enquiries", Send],
  ["visits", "Scheduled visits", CalendarCheck], ["messages", "Messages", MessageSquare], ["notifications", "Notifications", Bell],
  ["profile", "Profile", User], ["preferences", "Preferences", Settings2],
] as const;

export const Route = createFileRoute("/dashboard")({
  beforeLoad: guardArea("dashboard"),
  validateSearch: z.object({ tab: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Your dashboard — HouseProvider.in" },
    { name: "description", content: "Your saved homes, searches, comparisons and visit requests in one place." },
    { property: "og:title", content: "Your dashboard — HouseProvider.in" },
    { property: "og:description", content: "Track your home search journey." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Dashboard,
});

function Dashboard() {
  const { tab = "overview" } = Route.useSearch();
  const active = tabs.find(t => t[0] === tab) ?? tabs[0];
  const { ready } = useUserData();
  return <main className="dashboard-page"><div className="wrap">
    <div className="results-intro"><p className="kicker">YOUR SPACE</p><h1>Welcome <em>home.</em></h1></div>
    <RoleSwitcher/>
    <div className="dashboard-layout">
      <nav className="dash-nav" aria-label="Dashboard sections">{tabs.map(([id, label, Icon]) => <Link key={id} to="/dashboard" search={{ tab: id }} aria-current={active[0] === id ? "page" : undefined}><Icon size={16}/>{label}</Link>)}</nav>
      <section className="dash-panel" aria-labelledby="dash-title"><h2 id="dash-title">{active[1]}</h2><div key={active[0]} className="panel-entrance">{ready ? <Panel id={active[0]}/> : <TileSkeletons count={2}/>}</div></section>
    </div>
  </div></main>;
}

function Grid({ slugs, empty }: { slugs: string[]; empty: ReactNode }) {
  const live = useLiveListings();
  const items = slugs.map(s => live.data?.find(l => l.slug === s) ?? getListing(s)).filter(x => !!x);
  return items.length ? <div className="home-grid dash-grid">{items.map(h => <HomeTile key={h.slug} home={h} listing={h}/>)}</div> : <>{empty}</>;
}
const explore = <Button asChild><Link to="/properties">Explore homes</Link></Button>;

function Panel({ id }: { id: string }) {
  const { data } = useUserData();
  const live = useLiveListings();
  const findHome = (slug: string) => live.data?.find(l => l.slug === slug) ?? getListing(slug);
  switch (id) {
    case "matches": return <SmartMatches/>;
    case "saved": return <Grid slugs={data.saved} empty={<EmptyState icon={<Heart size={30}/>} title="No saved properties yet" action={explore}>Save properties you like and compare them later.</EmptyState>}/>;
    case "recent": return <Grid slugs={data.recent} empty={<EmptyState icon={<Eye size={30}/>} title="Nothing viewed yet" action={explore}>Homes you open will appear here.</EmptyState>}/>;
    case "compared": return <>{data.compare.length > 0 && <Button asChild variant="outline" className="dash-cta"><Link to="/compare">Open comparison</Link></Button>}<Grid slugs={data.compare} empty={<EmptyState icon={<GitCompareArrows size={30}/>} title="No properties to compare" action={explore}>Add up to four homes to compare them side by side.</EmptyState>}/></>;
    case "searches": return data.searches.length ? <ul className="dash-list search-list">{data.searches.map(s => <SavedSearchCard key={s.id} search={s}/>)}</ul>
      : <EmptyState icon={<Bookmark size={30}/>} title="No saved searches" action={explore}>Apply filters on the search page, then choose “Save search”.</EmptyState>;
    case "visits": return <MyDbVisits/>;
    case "enquiries": return <MyEnquiries empty={<EmptyState icon={<Send size={30}/>} title="No enquiries yet">Open a home and choose “Send an enquiry” while signed in.</EmptyState>}/>;
    case "messages": return <ChatPanel />;
    case "notifications": return <><MyNotifications/>{data.activity.length ? <ul className="dash-list activity">{data.activity.map(a => <li key={a.id}><div><strong>{a.text}</strong><small>{new Date(a.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></div></li>)}</ul>
      : <EmptyState icon={<Bell size={30}/>} title="No notifications">Activity on this device will appear here. Price and availability alerts arrive with accounts.</EmptyState>}</>;
    case "profile": return <div className="profile-card"><span className="avatar" aria-hidden="true"><User size={26}/></span><div><strong>Guest on this device</strong><p>Sign-in with email, phone or Google arrives in a later phase. Until then your data stays in this browser.</p><Button variant="outline" size="sm" onClick={() => { userActions.reset(); toast("Device data cleared"); }}>Clear data on this device</Button></div></div>;
    case "preferences": return <PreferencesForm/>;
    default: return <Overview/>;
  }
}

function Overview() {
  const { data } = useUserData();
  const steps = [["Viewed", data.recent.length], ["Saved", data.saved.length], ["Compared", data.compare.length], ["Contacted", 0], ["Visit scheduled", data.visits.filter(v => v.status !== "CANCELLED").length]] as const;
  const reached = steps.filter(s => s[1] > 0).length;
  return <>
    <ol className="journey" aria-label="Your property journey">{steps.map(([label, n], i) => <li key={label} className={n > 0 ? "done" : ""}><span className="journey-dot">{i + 1}</span><strong>{label}</strong><small>{label === "Contacted" ? "Opens later" : `${n}`}</small></li>)}</ol>
    <p className="journey-note">{reached ? `You’ve reached ${reached} of 5 stages.` : "Start by exploring a few homes."}</p>
    <div className="stat-grid">{([["saved", "Saved", data.saved.length], ["searches", "Saved searches", data.searches.length], ["compared", "Comparing", data.compare.length], ["visits", "Visit requests", data.visits.length]] as const).map(([tab, label, n]) => <Link key={tab} to="/dashboard" search={{ tab }} className="stat"><strong>{n}</strong><span>{label}</span></Link>)}</div>
    {data.recent.length > 0 && <><h3 className="dash-sub">Recently viewed</h3><Grid slugs={data.recent.slice(0, 3)} empty={null}/></>}
  </>;
}

function PreferencesForm() {
  const { data } = useUserData();
  const [p, setP] = useState<Preferences>(data.preferences);
  useEffect(() => setP(data.preferences), [data.preferences]);
  return <form className="pref-form" onSubmit={e => { e.preventDefault(); userActions.setPreferences(p); toast("Preferences saved on this device"); }}>
    <p className="filter-hint">Used only to explain match scores. Nothing is shared.</p>
    <label>Preferred city<select className="filter-select" value={p.location} onChange={e => setP({ ...p, location: e.target.value })}><option value="">No preference</option>{cities.map(c => <option key={c}>{c}</option>)}</select></label>
    <label>Monthly budget up to<select className="filter-select" value={p.max} onChange={e => setP({ ...p, max: e.target.value })}><option value="">No preference</option>{[30000, 60000, 100000, 150000].map(v => <option key={v} value={v}>₹{v.toLocaleString("en-IN")}</option>)}</select></label>
    <label>BHK<select className="filter-select" value={p.beds} onChange={e => setP({ ...p, beds: e.target.value })}><option value="">No preference</option>{["1", "2", "3", "4"].map(v => <option key={v} value={v}>{v === "4" ? "4+" : v} BHK</option>)}</select></label>
    <label>Furnishing<select className="filter-select" value={p.furnishing} onChange={e => setP({ ...p, furnishing: e.target.value })}><option value="">No preference</option>{["Fully furnished", "Semi furnished", "Unfurnished"].map(v => <option key={v}>{v}</option>)}</select></label>
    <label className="check"><input type="checkbox" checked={p.parking} onChange={e => setP({ ...p, parking: e.target.checked })}/>I need parking</label>
    <Button type="submit">Save preferences</Button>
  </form>;
}


