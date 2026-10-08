import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, BookmarkPlus, LayoutGrid, Map as MapIcon, Satellite, SearchX } from "lucide-react";
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
import { buildSearchSuggestions, readRecentSearches, rememberRecentSearch } from "@/lib/search-history";
import { pointInPolygon, type LngLatPoint } from "@/lib/geo";
import { rankMatches } from "@/lib/match";
import { displayPrice, type Listing } from "@/lib/catalog";

export const Route = createFileRoute("/properties")({
  validateSearch: filterSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    const toPrice = (value?: string) => {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const listingType = search.mode === "Buy" ? "BUY" : search.mode === "Rent" ? "RENT" : undefined;
    return (await listPropertiesFn({
      data: {
        take: 100,
        ...(listingType ? { listingType } : {}),
        ...(toPrice(search.min) !== undefined ? { minPrice: toPrice(search.min) } : {}),
        ...(toPrice(search.max) !== undefined ? { maxPrice: toPrice(search.max) } : {}),
        ...(search.beds ? { minBedrooms: Number(search.beds) >= 4 ? 4 : Number(search.beds), maxBedrooms: Number(search.beds) >= 4 ? undefined : Number(search.beds) } : {}),
        ...(search.minArea ? { minArea: Number(search.minArea) } : {}),
        ...(search.furnishing ? { furnishing: search.furnishing === "Fully furnished" ? "FULLY_FURNISHED" : search.furnishing === "Semi furnished" ? "SEMI_FURNISHED" : "UNFURNISHED" } : {}),
        ...(search.parking ? { parkingOnly: true } : {}), ...(search.baths ? { minBathrooms: Number(search.baths) } : {}),
        ...(search.amenities ? { amenities: search.amenities.split(",").filter(Boolean) } : {}), ...(search.available ? { availableNow: true } : {}), ...(search.verified ? { verifiedOnly: true } : {}),
        ...(search.propertyAgeMax ? { propertyAgeMax: Number(search.propertyAgeMax) } : {}), ...(search.floorMin ? { floorMin: Number(search.floorMin) } : {}), ...(search.floorMax ? { floorMax: Number(search.floorMax) } : {}), ...(search.totalFloorsMin ? { totalFloorsMin: Number(search.totalFloorsMin) } : {}),
      },
    })).map(toListing);
  },
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
  const [drawnPolygon, setDrawnPolygon] = useState<LngLatPoint[] | null>(null);
  const [place, setPlace] = useState(filters.location ?? "");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches());
  const view = filters.view === "map" || filters.view === "satellite" ? filters.view : "list";
  const results = applyFilters(listings, filters).filter(listing => !drawnPolygon || pointInPolygon([listing.lng, listing.lat], drawnPolygon));
  const sortedResults = [...results].sort((a, b) => {
    if (filters.sort) return 0;
    const rank = (p: typeof a) => p.promotion === "FEATURED" ? 2 : p.promotion === "BOOST" ? 1 : 0;
    return rank(b) - rank(a);
  });
  const chips = activeChips(filters);
  const prefs = data.preferences;
  const criteria = criteriaFrom(prefs, filters);
  const go = (next: Filters) => navigate({ search: next });
  const suggestions = buildSearchSuggestions(place, recentSearches);
  const select = (slug: string) => { setSelected(slug); document.getElementById(`tile-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
   const grid = sortedResults.map(h => <HomeTile key={h.slug} home={h} listing={h} match={computeMatch(h, criteria)} compact={view !== "list"} highlighted={hovered === h.slug || selected === h.slug} onHover={setHovered} {...(view !== "list" ? { onSelect: setSelected } : {})}/>);

  return <main className={`results-page view-${view}`}><div className="wrap">
    <div className="results-intro"><p className="kicker">THE COLLECTION</p><h1>Find your <em>place.</em></h1></div>
    <SmartSearch filters={filters} onApply={f => { setPlace(f.location ?? ""); go(f); }} count={results.length}/>
    <AIPropertyAssistant listings={listings} filters={filters}/>



function AIPropertyAssistant({ listings, filters }: { listings: Listing[]; filters: Filters }) {
  const criteria = criteriaFrom(undefined, filters);
  const ranked = rankMatches(listings, criteria).slice(0, 3);
  if (ranked.length === 0) return null;
  return <section className="ai-property-assistant" aria-labelledby="ai-assistant-title">
    <div className="ai-assistant-head"><div><p className="kicker">AI PROPERTY ASSISTANT</p><h2 id="ai-assistant-title">I found your strongest matches.</h2><p>Recommendations are based only on the criteria you entered. Nothing about commute, safety or verification is guessed.</p></div><span className="ai-assistant-badge">Smart recommendations</span></div>
    <div className="ai-assistant-list">{ranked.map(({ listing, match }) => <Link key={listing.slug} to="/property/$slug" params={{ slug: listing.slug }} className="ai-assistant-item"><div><strong>{listing.name}</strong><span>{listing.neighborhood}, {listing.city} · {listing.beds} BHK · {displayPrice(listing)}</span></div><b>{match.score}% match</b></Link>)}</div>
  </section>;
}
function NoResults({ onClear }: { onClear: () => void }) {
  return <EmptyState icon={<SearchX size={34}/>} title="No properties found." action={<Button variant="outline" onClick={onClear}>Clear all filters</Button>}>Try expanding your budget or location, or removing a filter.</EmptyState>;
}



