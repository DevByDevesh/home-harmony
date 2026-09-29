import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/list-property")({ head: () => ({ meta: [
  { title: "For property owners — HouseProvider.in" },
  { name: "description", content: "Property submissions are not yet open on HouseProvider.in. Discover fictional showcase homes while listing tools are prepared." },
  { property: "og:title", content: "For property owners — HouseProvider.in" },
  { property: "og:description", content: "Property submissions are not yet open on HouseProvider.in." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: OwnersPage });
function OwnersPage() { return <main className="owners-page"><div className="wrap"><Link to="/" className="text-link"><ArrowLeft size={17}/> Back home</Link><div className="owners-copy"><p className="kicker">FOR PROPERTY OWNERS</p><h1>Every home has<br/><em>a story to tell.</em></h1><p>We’re preparing a considered way to share your space. Property submissions aren’t open yet.</p><Button asChild><Link to="/properties">Explore homes <ArrowUpRight size={17}/></Link></Button></div></div></main>; }
