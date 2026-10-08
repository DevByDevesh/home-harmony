import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PropertyDetailView } from "@/components/property-detail-view";
import { HomeTile } from "@/components/home-tile";
import { useEffect } from "react";
import { displayPrice, availabilityLabel, inr } from "@/lib/catalog";
import { getPropertyFn, listPropertiesFn } from "@/lib/properties.functions";
import { toListing } from "@/lib/property-mapper";
import { CompareButton, SaveButton } from "@/components/listing-actions";
import { VisitScheduler } from "@/components/visit-scheduler";
import { EnquiryButton } from "@/components/engagement";
import { PropertyReviews } from "@/components/property-reviews";
import { userActions, useUserData } from "@/lib/user-data";
import { MatchPanel } from "@/components/match-badge";
import { criteriaFrom, evaluateMatch } from "@/lib/match";
import type { Listing } from "@/lib/catalog";
function YourMatch({ home }: { home: Listing }) { const { data, ready } = useUserData(); if (!ready) return null; return <MatchPanel outcome={evaluateMatch(home, criteriaFrom(data.preferences))}/>; }
export const Route = createFileRoute("/property/$slug")({
  validateSearch: z.object({ contact: z.boolean().optional() }),
  loader: async ({ params }) => {
    const [row, all] = await Promise.all([getPropertyFn({ data: { idOrSlug: params.slug } }), listPropertiesFn({ data: { take: 100 } })]);
    if (!row) throw notFound();
    const home = toListing(row);
    const related = all.map(toListing).filter(item => item.slug !== home.slug && (item.city === home.city || item.mode === home.mode)).slice(0, 3);
    return { home, related, listings: all.map(toListing) };
  },
  notFoundComponent: () => <main className="detail-page"><div className="wrap"><div className="detail-top"><Link to="/properties"><ArrowLeft size={16}/> Back to all homes</Link></div><h1>Property not found.</h1></div></main>,
  errorComponent: () => <main className="detail-page"><div className="wrap"><div className="detail-top"><Link to="/properties"><ArrowLeft size={16}/> Back to all homes</Link></div><h1>This property could not be loaded.</h1></div></main>,
  head: ({ loaderData: d }) => { const loaderData = d?.home; return { meta: [
    { title: loaderData ? `${loaderData.name} in ${loaderData.neighborhood} — HouseProvider.in` : "Property not found — HouseProvider.in" },
    { name: "description", content: loaderData ? `Explore this ${loaderData.beds} BHK ${loaderData.kind.toLowerCase()} in ${loaderData.neighborhood}, ${loaderData.city}.` : "This property could not be found." },
    { property: "og:title", content: loaderData ? `${loaderData.name} — HouseProvider.in` : "Property not found — HouseProvider.in" },
    { property: "og:description", content: loaderData ? `A home in ${loaderData.neighborhood}, ${loaderData.city}.` : "This property could not be loaded." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }; }, component: DetailPage,
});
function DetailPage() {
  const { home, related, listings } = Route.useLoaderData();
  const { contact } = Route.useSearch();
  useEffect(() => { userActions.viewed(home.slug); }, [home.slug]);
  return <main className="detail-page"><div className="wrap"><div className="detail-top"><Link to="/properties"><ArrowLeft size={16}/> Back to all homes</Link><span>PROPERTY / {home.city.toUpperCase()}</span></div><PropertyDetailView home={home} listings={listings} images={home.galleryImages} actions={<><SaveButton home={home} variant="full"/><CompareButton home={home} variant="full"/></>} imageNote="Property image" disclaimer="Property details and pricing are subject to owner confirmation and availability." aside={<div className="detail-summary"><p className="kicker">AT A GLANCE</p><h3>{displayPrice(home)}{home.mode === "Rent" && <small> / month</small>}</h3><div><span>Property type</span><strong>{home.kind}</strong></div><div><span>Furnishing</span><strong>{home.furnishing}</strong></div><div><span>Availability</span><strong>{availabilityLabel(home)}</strong></div>{home.mode === "Rent" && <div><span>Deposit</span><strong>{inr(home.deposit)}</strong></div>}<div><span>Brokerage</span><strong>{home.brokerage}</strong></div><div><span>Parking</span><strong>{home.parking ? `${home.parking} listed` : "None listed"}</strong></div><div><span>Verification</span><strong>Not verified</strong></div><YourMatch home={home}/><div id="visit-request"><VisitScheduler home={home}/></div><EnquiryButton slug={home.slug} name={home.name} autoOpen={contact === true}/><p>Submit a visit request and the property owner can respond through HouseProvider.</p><Link className="text-link" to="/properties">Explore more homes <ArrowUpRight size={17}/></Link></div>}/><PropertyReviews slug={home.slug}/><section className="similar"><div className="feature-heading"><div><p className="kicker">KEEP DISCOVERING</p><h2>More spaces to love.</h2></div><Link className="text-link" to="/properties">View all homes <ArrowUpRight size={18}/></Link></div><div className="home-grid">{related.map(item => <HomeTile home={item} key={item.slug}/>)}</div></section></div></main>;
}
