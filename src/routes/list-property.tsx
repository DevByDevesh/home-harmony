import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/list-property")({
  head: () => ({ meta: [
    { title: "List your property — HouseProvider.in" },
    { name: "description", content: "Property listing tools are being prepared for HouseProvider.in. Explore the current showcase collection." },
    { property: "og:title", content: "List your property — HouseProvider.in" },
    { property: "og:description", content: "Property listing tools are being prepared for HouseProvider.in." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ListProperty,
});

function ListProperty() {
  return <main className="coming-page"><div className="container-wide"><Link to="/" className="inline-arrow"><ArrowLeft size={18}/> Back to home</Link><div className="coming-content"><p className="eyebrow">FOR PROPERTY OWNERS</p><h1>Your property deserves<br/><em>the right audience.</em></h1><p>We're preparing a thoughtful way for owners and agents to share their spaces. Listing submissions aren't open yet.</p><Button asChild className="coming-button"><Link to="/properties">Explore homes <ArrowUpRight size={18}/></Link></Button></div></div></main>;
}