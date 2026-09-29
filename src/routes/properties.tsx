import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SearchX } from "lucide-react";
import { DiscoverySearch } from "@/components/discovery-search";
import { HomeTile } from "@/components/home-tile";
import { homes, searchHomes } from "@/lib/catalog";
const querySchema = z.object({ location: z.string().optional(), mode: z.string().optional(), kind: z.string().optional(), max: z.string().optional() });
export const Route = createFileRoute("/properties")({
  validateSearch: querySchema,
  head: () => ({ meta: [
    { title: "Explore homes across India — HouseProvider.in" },
    { name: "description", content: "Browse fictional example homes across India by city, budget, property type and rent or buy." },
    { property: "og:title", content: "Explore homes across India — HouseProvider.in" },
    { property: "og:description", content: "Find a space that fits the way you live." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: ResultsPage,
});
function ResultsPage() {
  const query = Route.useSearch();
  const results = searchHomes(homes, query);
  return <main className="results-page"><div className="wrap"><div className="results-intro"><p className="kicker">THE COLLECTION</p><h1>Find your <em>place.</em></h1><p>Explore spaces for every new beginning.</p></div><DiscoverySearch initial={query}/><div className="results-line"><div><p className="kicker">HOMES TO EXPLORE</p><h2>{results.length} {results.length === 1 ? "space" : "spaces"} found</h2></div><span>Fictional showcase properties</span></div>{results.length ? <div className="home-grid results-grid">{results.map(home => <HomeTile home={home} key={home.slug}/>)}</div> : <div className="empty-result"><SearchX size={34}/><h2>No properties found.</h2><p>Try expanding your budget or location, or choose another property type.</p></div>}</div></main>;
}
