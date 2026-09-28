import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SearchForm } from "@/components/search-form";
import { PropertyCard } from "@/components/property-card";
import { filterProperties, properties } from "@/lib/properties";
import { SearchX } from "lucide-react";

const searchSchema = z.object({ location: z.string().optional(), intent: z.string().optional(), type: z.string().optional(), budget: z.string().optional() });
export const Route = createFileRoute("/properties")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Explore homes in India — HouseProvider.in" }, { name: "description", content: "Browse fictional showcase homes across Pune, Mumbai, Bengaluru, Hyderabad and Chennai by location, budget and property type." },
    { property: "og:title", content: "Explore homes in India — HouseProvider.in" }, { property: "og:description", content: "Find your next space with HouseProvider's property search." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Properties,
});
function Properties() {
  const search = Route.useSearch();
  const results = filterProperties(properties, search);
  return <main className="listing-page"><div className="container-wide"><div className="listing-intro"><p className="eyebrow">FIND YOUR PLACE</p><h1>Explore <em>homes.</em></h1><p>Thoughtfully selected spaces for wherever life takes you next.</p></div><SearchForm initial={search} compact/><div className="results-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>{results.length} {results.length === 1 ? "home" : "homes"} to explore</h2></div><span>Fictional showcase listings</span></div>{results.length ? <div className="property-grid results-grid">{results.map((property, index) => <PropertyCard key={property.slug} property={property} index={index}/>)}</div> : <div className="empty-state"><SearchX size={36}/><h3>No homes found</h3><p>Try a different city, property type or a higher budget.</p></div>}</div></main>;
}