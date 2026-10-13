import { createFileRoute, Link } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/auth.functions";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/list-property")({
  loader: async () => ({ user: await getCurrentUser() }),
  head: () => ({ meta: [
  { title: "For property owners and agents — HouseProvider.in" },
  { name: "description", content: "Learn how property owners and agents can manage property listings and enquiries with HouseProvider.in." },
  { property: "og:title", content: "For property owners and agents — HouseProvider.in" },
  { property: "og:description", content: "Property listing tools and enquiry management for owners and agents." },
  { property: "og:type", content: "website" }, { name: "twitter:title", content: "For property owners and agents — HouseProvider.in" }, { name: "twitter:description", content: "Property listing tools and enquiry management for owners and agents." }, { property: "og:url", content: "https://houseprovider.in/list-property" }, { property: "og:image", content: "https://houseprovider.in/og-houseprovider.svg" }, { property: "og:image:alt", content: "HouseProvider.in — Find a place that feels like home" }, { name: "twitter:image:alt", content: "HouseProvider.in — Find a place that feels like home" }, { name: "twitter:card", content: "summary_large_image" },
], links: [{ rel: "canonical", href: "https://houseprovider.in/list-property" }] }), component: OwnersPage });
function OwnersPage() {
  const { user } = Route.useLoaderData();
  const isOwner = user?.role === "OWNER";
  const isAgent = user?.role === "AGENT";
  return <main className="owners-page"><div className="wrap"><Link to="/" className="text-link"><ArrowLeft size={17}/> Back home</Link><div className="owners-copy"><p className="kicker">FOR OWNERS & AGENTS</p><h1>Every home has<br/><em>a story to tell.</em></h1><p>Try the listing flow and dashboards in current mode. Listings stay on your device and go to review — nothing is published until moderation is connected.</p><div className="fallback-actions"><Button asChild><Link to="/owner/new">Start a listing <ArrowUpRight size={17}/></Link></Button>{isOwner && <Button asChild variant="outline"><Link to="/owner">Owner dashboard</Link></Button>}{isAgent && <Button asChild variant="outline"><Link to="/agent">Agent CRM</Link></Button>}</div></div></div></main>;
}

