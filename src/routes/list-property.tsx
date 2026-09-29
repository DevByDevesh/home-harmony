import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/list-property")({ head: () => ({ meta: [
  { title: "For property owners and agents — HouseProvider.in" },
  { name: "description", content: "Create a listing in nine guided steps, manage it from the owner dashboard, or run your pipeline in the agent CRM — currently in demo mode." },
  { property: "og:title", content: "For property owners and agents — HouseProvider.in" },
  { property: "og:description", content: "Owner listing tools and an agent CRM, in demo mode." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: OwnersPage });
function OwnersPage() { return <main className="owners-page"><div className="wrap"><Link to="/" className="text-link"><ArrowLeft size={17}/> Back home</Link><div className="owners-copy"><p className="kicker">FOR OWNERS & AGENTS</p><h1>Every home has<br/><em>a story to tell.</em></h1><p>Try the listing flow and dashboards in demo mode. Listings stay on your device and go to review — nothing is published until moderation is connected.</p><div className="fallback-actions"><Button asChild><Link to="/owner/new">Start a listing <ArrowUpRight size={17}/></Link></Button><Button asChild variant="outline"><Link to="/owner">Owner dashboard</Link></Button><Button asChild variant="outline"><Link to="/agent">Agent CRM</Link></Button></div></div></div></main>; }
