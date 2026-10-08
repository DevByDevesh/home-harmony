import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, LoaderCircle } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import hero from "@/assets/new-hero.jpg";
import { Button } from "@/components/ui/button";
import { DiscoverySearch } from "@/components/discovery-search";
import { HomeTile } from "@/components/home-tile";
import { Reveal } from "@/components/cinematic-motion";
const HomepageShowcase = lazy(() => import("@/components/homepage-showcase").then(m => ({ default: m.HomepageShowcase })));
import { SmartSearch } from "@/components/smart-search";
import { useLiveListings } from "@/lib/use-live-listings";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "HouseProvider.in — Find a place that feels like home" },
    { name: "description", content: "Discover homes across India. Search by location, property type and budget." },
    { property: "og:title", content: "HouseProvider.in — Find a place that feels like home" },
    { property: "og:description", content: "Discover homes across India. Search by location, property type and budget." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [loadLive, setLoadLive] = useState(false);
  useEffect(() => {
    const start = () => setLoadLive(true);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(start, { timeout: 1500 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(start, 900);
    return () => window.clearTimeout(id);
  }, []);
  const { data: liveListings = [], isLoading, isError } = useLiveListings({ enabled: loadLive });
  const featured = liveListings.slice(0, 3);
  const cities = Array.from(new Set(liveListings.map(item => item.city))).slice(0, 4);

  return <main className="homepage-v2">
    <section className="hero">
      <img src={hero} alt="Sunlit contemporary living room with a plum sofa and garden outlook" className="hero-photo" width={1600} height={1056} fetchPriority="high"/>
      <div className="hero-overlay"/>
      <div className="wrap hero-layout">
        <div className="hero-copy">
          <p className="hero-label"><span/> A NEW WAY TO FIND YOUR PLACE</p>
          <h1>Find a place<br/>that feels like <em>home.</em></h1>
          <p className="hero-description">Discover homes, neighborhoods and spaces intelligently — based on how you actually want to live.</p>
          <div className="hero-ctas">
            <Button asChild className="hero-primary"><Link to="/properties">Find My Home <ArrowUpRight size={18}/></Link></Button>
            <Link to="/list-property" className="hero-secondary">List Your Property <ArrowRight size={17}/></Link>
          </div>
        </div>
        <div className="hero-foot"><span>SPACES FOR THE WAY YOU LIVE</span><a href="#discover" aria-label="Scroll to search"><ArrowDown size={19}/></a><span>01 — DISCOVER</span></div>
      </div>
    </section>

    <section className="discover-section" id="discover">
      <div className="wrap">
        <Reveal><div className="section-heading"><div><p className="kicker">LIVE INVENTORY / 01</p><h2>Start with where<br/>you want to <em>live.</em></h2></div><p>Search the homes currently listed on HouseProvider. No editorial placeholders — just the live inventory available to explore.</p></div></Reveal>
        <Reveal delay={0.08}><DiscoverySearch/></Reveal>
        {cities.length > 0 && <div className="quick-cities"><span>EXPLORE AVAILABLE CITIES</span>{cities.map(city => <Link to="/properties" search={{ location: city }} key={city}>{city} <ArrowUpRight size={13}/></Link>)}</div>}
        <Reveal className="home-smart"><SmartSearch filters={{}} count={liveListings.length} onApply={filters => { void navigate({ to: "/properties", search: filters }); }}/></Reveal>
      </div>
    </section>

    <section className="featured-section homepage-live-section">
      <div className="wrap">
        <Reveal><div className="feature-heading"><div><p className="kicker">LIVE COLLECTION / 02</p><h2>Homes worth a <em>closer look.</em></h2></div><Button asChild variant="outline" className="outline-cta"><Link to="/properties">Explore all homes <ArrowUpRight size={16}/></Link></Button></div></Reveal>
        {isLoading ? <div className="homepage-state"><LoaderCircle size={24} className="spin"/><span>Loading live homes…</span></div> : isError ? <div className="homepage-state homepage-state-error"><strong>Homes are temporarily unavailable.</strong><span>Please try again in a moment.</span><Link to="/properties">Open property search <ArrowUpRight size={15}/></Link></div> : featured.length === 0 ? <div className="homepage-state homepage-state-empty"><strong>No live homes yet.</strong><span>Be the first to list a property on HouseProvider.</span><Link to="/list-property">List your property <ArrowUpRight size={15}/></Link></div> : <div className="home-grid">{featured.map((home, i) => <Reveal key={home.slug} delay={i * 0.07}><HomeTile home={home} listing={home}/></Reveal>)}</div>}
        {!isLoading && !isError && featured.length > 0 && <p className="collection-note">Showing live HouseProvider listings. Availability and verification status come from listing records.</p>}
      </div>
    </section>

    <Suspense fallback={null}><HomepageShowcase listings={liveListings}/></Suspense>

    <section className="final-cta"><div className="wrap final-inner"><div><p className="kicker">YOUR NEXT CHAPTER</p><h2>Good things start<br/><em>with a place.</em></h2></div><Button asChild className="final-button"><Link to="/properties">Explore live homes <ArrowUpRight size={18}/></Link></Button></div></section>
  </main>;
}