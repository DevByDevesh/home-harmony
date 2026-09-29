import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PropertyDetailView } from "@/components/property-detail-view";
import { HomeTile } from "@/components/home-tile";
import { useEffect } from "react";
import { homes, displayPrice, getListing, availabilityLabel, inr } from "@/lib/catalog";
import { CompareButton, SaveButton } from "@/components/listing-actions";
import { VisitScheduler } from "@/components/visit-scheduler";
import { userActions } from "@/lib/user-data";
export const Route = createFileRoute("/property/$slug")({
  loader: ({ params }) => { const home = getListing(params.slug); if (!home) throw notFound(); return home; },
  head: ({ loaderData }) => ({ meta: [
    { title: loaderData ? `${loaderData.name} in ${loaderData.neighborhood} — HouseProvider.in` : "Property not found — HouseProvider.in" },
    { name: "description", content: loaderData ? `Explore this fictional ${loaderData.beds} BHK ${loaderData.kind.toLowerCase()} in ${loaderData.neighborhood}, ${loaderData.city}.` : "This property could not be found." },
    { property: "og:title", content: loaderData ? `${loaderData.name} — HouseProvider.in` : "Property not found — HouseProvider.in" },
    { property: "og:description", content: loaderData ? `A fictional home in ${loaderData.neighborhood}, ${loaderData.city}.` : "This property could not be found." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: DetailPage,
});
function DetailPage() {
  const home = Route.useLoaderData();
  useEffect(() => { userActions.viewed(home.slug); }, [home.slug]);
  const related = homes.filter(item => item.slug !== home.slug && (item.city === home.city || item.mode === home.mode)).slice(0, 3);
  return <main className="detail-page"><div className="wrap"><div className="detail-top"><Link to="/properties"><ArrowLeft size={16}/> Back to all homes</Link><span>FICTIONAL PROPERTY / {home.city.toUpperCase()}</span></div><PropertyDetailView home={home} actions={<><SaveButton home={home} variant="full"/><CompareButton home={home} variant="full"/></>} imageNote="Illustrative image · Additional media not available" disclaimer="This is a fictional showcase property. Its details and price are illustrative, not a live offer." aside={<div className="detail-summary"><p className="kicker">AT A GLANCE</p><h3>{displayPrice(home)}{home.mode === "Rent" && <small> / month</small>}</h3><div><span>Property type</span><strong>{home.kind}</strong></div><div><span>Furnishing</span><strong>{home.furnishing}</strong></div><div><span>Availability</span><strong>{availabilityLabel(home)}</strong></div>{home.mode === "Rent" && <div><span>Deposit</span><strong>{inr(home.deposit)}</strong></div>}<div><span>Brokerage</span><strong>{home.brokerage}</strong></div><div><span>Parking</span><strong>{home.parking ? `${home.parking} listed` : "None listed"}</strong></div><div><span>Verification</span><strong>Not verified</strong></div><VisitScheduler home={home}/><p>Visit requests are a demo and stay on this device. No owner details are shown and none will be contacted.</p><Link className="text-link" to="/properties">Explore more homes <ArrowUpRight size={17}/></Link></div>}/><section className="similar"><div className="feature-heading"><div><p className="kicker">KEEP DISCOVERING</p><h2>More spaces to love.</h2></div><Link className="text-link" to="/properties">View all homes <ArrowUpRight size={18}/></Link></div><div className="home-grid">{related.map(item => <HomeTile home={item} key={item.slug}/>)}</div></section></div></main>;
}
