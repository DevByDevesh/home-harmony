import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import hero from "@/assets/new-hero.jpg";
import { Button } from "@/components/ui/button";
import { DiscoverySearch } from "@/components/discovery-search";
import { HomeTile } from "@/components/home-tile";
import { Reveal } from "@/components/cinematic-motion";
import { HomepageShowcase } from "@/components/homepage-showcase";
import { SmartSearch } from "@/components/smart-search";
import { listings } from "@/lib/catalog";
import { homes } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "HouseProvider.in — Find a place that feels like home" },
    { name: "description", content: "Discover thoughtfully presented fictional homes across India. Search by location, property type and budget." },
    { property: "og:title", content: "HouseProvider.in — Find a place that feels like home" },
    { property: "og:description", content: "An original way to explore homes across India." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: HomePage,
});
function HomePage() { const navigate = useNavigate(); return <main>
  <section className="hero"><img src={hero} alt="Sunlit contemporary living room with a plum sofa and garden outlook" className="hero-photo" width={1600} height={1056} fetchPriority="high"/><div className="hero-overlay"/><div className="wrap hero-layout"><div className="hero-copy"><p className="hero-label"><span/> A NEW WAY TO FIND YOUR PLACE</p><h1>Find a place<br/>that feels like <em>home.</em></h1><p className="hero-description">Discover homes, neighborhoods and spaces intelligently — based on how you actually want to live.</p><div className="hero-ctas"><Button asChild className="hero-primary"><Link to="/properties">Find My Home <ArrowUpRight size={18}/></Link></Button><Link to="/list-property" className="hero-secondary">List Your Property <ArrowRight size={17}/></Link></div></div><div className="hero-foot"><span>SPACES FOR THE WAY YOU LIVE</span><a href="#discover" aria-label="Scroll to search"><ArrowDown size={19}/></a><span>01 — DISCOVER</span></div></div></section>
  <section className="discover-section" id="discover"><div className="wrap"><Reveal><div className="section-heading"><div><p className="kicker">THE SEARCH STARTS HERE</p><h2>Where do you want<br/>to <em>live?</em></h2></div><p>Every new beginning starts somewhere. Tell us what matters most, and find a space that feels right.</p></div></Reveal><Reveal delay={0.08}><DiscoverySearch/></Reveal><div className="quick-cities"><span>EXPLORE BY CITY</span>{["Pune", "Mumbai", "Bengaluru", "Delhi NCR"].map(city => <Link to="/properties" search={{ location: city }} key={city}>{city} <ArrowUpRight size={13}/></Link>)}</div><Reveal className="home-smart"><SmartSearch filters={{}} count={listings.length} onApply={filters => { void navigate({ to: "/properties", search: filters }); }}/></Reveal></div></section>
  <section className="featured-section"><div className="wrap"><Reveal><div className="feature-heading"><div><p className="kicker">THE COLLECTION / 01</p><h2>Spaces with <em>possibility.</em></h2></div><Button asChild variant="outline" className="outline-cta"><Link to="/properties">Explore all homes <ArrowUpRight size={16}/></Link></Button></div></Reveal><div className="home-grid">{homes.slice(0, 3).map((home, i) => <Reveal key={home.slug} delay={i * 0.07}><HomeTile home={home}/></Reveal>)}</div><p className="collection-note">Illustrative properties · Fictional details and prices</p></div></section>
  <HomepageShowcase/>
  <section className="final-cta"><div className="wrap final-inner"><div><p className="kicker">YOUR NEXT CHAPTER</p><h2>Good things start<br/><em>with a place.</em></h2></div><Button asChild className="final-button"><Link to="/properties">Explore homes <ArrowUpRight size={18}/></Link></Button></div></section>
</main>; }
