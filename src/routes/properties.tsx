import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookmarkPlus, LayoutGrid, Map as MapIcon, Satellite, SearchX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import MapboxCanvas from "@/components/mapbox-canvas";
import { EmptyState } from "@/components/empty-state";
import { FilterSheet } from "@/components/filter-sheet";
import { HomeTile } from "@/components/home-tile";
import { listPropertiesFn } from "@/lib/properties.functions";
import { toListing } from "@/lib/property-mapper";
import { activeChips, applyFilters, clearFilters, filterSchema, type Filters } from "@/lib/filters";
import { computeMatch, criteriaFrom } from "@/lib/match";
import { SmartSearch } from "@/components/smart-search";
import { EditableChip } from "@/components/editable-chip";
import { userActions, useUserData } from "@/lib/user-data";

export const Route = createFileRoute("/properties")({
  validateSearch: filterSchema,
  loader: async () => (await listPropertiesFn({ data: { take: 100 } })).map(toListing),
  errorComponent: () => <main className="results-page"><div className="wrap"><EmptyState icon={<SearchX size={34}/>} title="Homes could not be loaded.">Please try again in a moment.</EmptyState></div></main>,
  head: () => ({ meta: [
    { title: "Explore homes on list or map — HouseProvider.in" },
    { name: "description", content: "Discover homes across India by budget, BHK, furnishing and amenities, on a list or map." },
    { property: "og:title", content: "Explore homes on list or map — HouseProvider.in" },
    { property: "og:description", content: "Find a space that fits the way you live." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: ResultsPage,
});

function ResultsPage() {
  const filters = Route.useSearch();
  const listings = Route.useLoaderData();
  const navigate = useNavigate({ from: "/properties" });
  const { data } = useUserData();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [place, setPlace] = useState(filters.location ?? "");
  const view = filters.view === "map" || filters.view === "satellite" ? filters.view : "list";
  const results = applyFilters(listings, filters);
  const chips = activeChips(filters);
  const prefs = data.preferences;
  const criteria = criteriaFrom(prefs, filters);
  const go = (next: Filters) => navigate({ search: next });
  const select = (slug: string) => { setSelected(slug); document.getElementById(`tile-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
   const grid = results.map(h => <HomeTile key={h.slug} home={h} listing={h} match={computeMatch(h, criteria)} compact={view !== "list"} highlighted={hovered === h.slug || selected === h.slug} onHover={setHovered} {...(view !== "list" ? { onSelect: setSelected } : {})}/>);

  return <main className={`results-page view-${view}`}><div className="wrap">
    <div className="results-intro"><p className="kicker">THE COLLECTION</p><h1>Find your <em>place.</em></h1></div>
    <SmartSearch filters={filters} onApply={f => { setPlace(f.location ?? ""); go(f); }} count={results.length}/>
    <div className="results-toolbar">
      <form className="toolbar-search" onSubmit={e => { e.preventDefault(); go({ ...filters, location: place.trim() || undefined }); }}>
        <div className="mode-toggle" role="group" aria-label="Looking to">{["Rent", "Buy"].map(m => <button type="button" key={m} aria-pressed={filters.mode === m} onClick={() => go({ ...filters, mode: filters.mode === m ? undefined : m, min: undefined, max: undefined })}>{m}</button>)}</div>
        <input value={place} onChange={e => setPlace(e.target.value)} placeholder="Where do you want to live?" aria-label="City or locality"/>
      </form>
      <FilterSheet filters={filters} onApply={go} activeCount={chips.length}/>
      <select className="sort-select" aria-label="Sort" value={filters.sort ?? ""} onChange={e => go({ ...filters, sort: e.target.value || undefined })}><option value="">Recommended order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="area">Largest area</option><option value="recent">Recently updated</option></select>
      <div className="view-toggle" role="group" aria-label="View">
        {([["list", LayoutGrid, "List"], ["map", MapIcon, "Map"], ["satellite", Satellite, "Satellite"]] as const).map(([v, Icon, label]) => <button type="button" key={v} aria-pressed={view === v} onClick={() => go({ ...filters, view: v === "list" ? undefined : v })}><Icon size={15}/><span>{label}</span></button>)}
      </div>
    </div>
    {chips.length > 0 && <div className="chip-row" aria-label="Active filters">{chips.map(c => <EditableChip key={c.key + (c.value ?? "") + (filters[c.key] ?? "")} chip={c} filters={filters} onChange={next => { setPlace(next.location ?? ""); go(next); }}/>)}<button type="button" className="chip-clear" onClick={() => { setPlace(""); go(clearFilters(filters)); }}>Clear all</button></div>}
    <div className="results-line"><div><p className="kicker">HOMES TO EXPLORE</p><h2 aria-live="polite"><span key={results.length} className="count-change">{results.length}</span> {results.length === 1 ? "space" : "spaces"} found</h2></div><div className="results-line-end"><span>Property listings</span>{chips.length > 0 && <Button variant="outline" size="sm" onClick={() => { userActions.saveSearch(chips.map(c => c.label).join(" · "), { ...filters, view: undefined, q: undefined }, listings); toast("Search saved successfully"); }}><BookmarkPlus size={15}/>Save search</Button>}</div></div>
     {view === "list" ? (results.length ? <div key="list" className="home-grid results-grid results-entrance">{grid}</div> : <NoResults onClear={() => { setPlace(""); go(clearFilters(filters)); }}/>)
       : <div key={view} className="map-layout results-entrance">
          <div className="map-list">{results.length ? grid : <NoResults onClear={() => { setPlace(""); go(clearFilters(filters)); }}/>}</div>
          <div className="map-pane"><MapboxCanvas homes={results} selected={selected} hovered={hovered} onHover={setHovered} onSelect={select} layer={view}/></div>
        </div>}
  </div></main>;
}
function NoResults({ onClear }: { onClear: () => void }) {
  return <EmptyState icon={<SearchX size={34}/>} title="No properties found." action={<Button variant="outline" onClick={onClear}>Clear all filters</Button>}>Try expanding your budget or location, or removing a filter.</EmptyState>;
}



