import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, LoaderCircle } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import hero from "@/assets/new-hero.jpg";
import { Button } from "@/components/ui/button";
import { DiscoverySearch } from "@/components/discovery-search";
import { HomeTile } from "@/components/home-tile";
import { Reveal } from "@/components/cinematic-motion";
const HomepageShowcase = lazy(() =>
  import("@/components/homepage-showcase").then((m) => ({ default: m.HomepageShowcase })),
);
import { SmartSearch } from "@/components/smart-search";
import { useLiveListings } from "@/lib/use-live-listings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Buy & Rent Homes in India | HouseProvider.in" },
      {
        name: "description",
        content: "Find homes for rent and sale across India. Explore property listings by location, budget and property type on HouseProvider.in.",
      },
      { property: "og:title", content: "Buy & Rent Homes in India | HouseProvider.in" },
      {
        property: "og:description",
        content: "Find homes for rent and sale across India. Explore property listings by location, budget and property type on HouseProvider.in.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://houseprovider.in/" },
      { name: "twitter:title", content: "Buy & Rent Homes in India | HouseProvider.in" },
      { name: "twitter:description", content: "Find homes for rent and sale across India. Explore property listings by location, budget and property type on HouseProvider.in." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://houseprovider.in/" },
      { rel: "preload", as: "image", href: hero, fetchPriority: "high" },
    ],
  }),
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
  const promoted = liveListings.filter((item) => item.promotion === "FEATURED");
  const boosted = liveListings.filter((item) => item.promotion === "BOOST");
  const featured = [
    ...promoted,
    ...liveListings.filter((item) => item.promotion !== "FEATURED"),
  ].slice(0, 3);
  const cities = Array.from(new Set(liveListings.map((item) => item.city))).slice(0, 4);
  const showcaseSentinel = useRef<HTMLDivElement | null>(null);
  const [loadShowcase, setLoadShowcase] = useState(false);

  useEffect(() => {
    const node = showcaseSentinel.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setLoadShowcase(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLoadShowcase(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="homepage-v2">
      <section className="hero">
        <img
          src={hero}
          alt="Sunlit contemporary living room with a plum sofa and garden outlook"
          className="hero-photo"
          width={1600}
          height={1600}
          fetchPriority="high"
        />
        <div className="hero-overlay" />
        <div className="wrap hero-layout">
          <div className="hero-copy">
            <p className="hero-label">
              <span /> A NEW WAY TO FIND YOUR PLACE
            </p>
            <h1>
              Find homes to
              <br />
              rent or <em>buy.</em>
            </h1>
            <p className="hero-description">
              Discover homes, neighborhoods and spaces intelligently — based on how you actually
              want to live.
            </p>
            <div className="hero-ctas">
              <Button asChild className="hero-primary">
                <Link to="/properties">
                  Find My Home <ArrowUpRight size={18} />
                </Link>
              </Button>
              <Link to="/list-property" className="hero-secondary">
                List Your Property <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div className="hero-foot">
            <span>SPACES FOR THE WAY YOU LIVE</span>
            <a href="#discover" aria-label="Scroll to search">
              <ArrowDown size={19} />
            </a>
            <span>01 — DISCOVER</span>
          </div>
        </div>
      </section>

      <section className="discover-section" id="discover">
        <div className="wrap">
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="kicker">LIVE INVENTORY / 01</p>
                <h2>
                  Start with where
                  <br />
                  you want to <em>live.</em>
                </h2>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <DiscoverySearch />
          </Reveal>
          {cities.length > 0 && (
            <div className="quick-cities">
              <span>EXPLORE AVAILABLE CITIES</span>
              {cities.map((city) => (
                <Link to="/properties" search={{ location: city }} key={city}>
                  {city} <ArrowUpRight size={13} />
                </Link>
              ))}
            </div>
          )}
          <Reveal className="home-smart">
            <SmartSearch
              filters={{}}
              count={liveListings.length}
              onApply={(filters) => {
                void navigate({ to: "/properties", search: filters });
              }}
            />
          </Reveal>
        </div>
      </section>

      <section className="featured-section homepage-live-section">
        <div className="wrap">
          <Reveal>
            <div className="feature-heading">
              <div>
                <p className="kicker">LIVE COLLECTION / 02</p>
                <h2>
                  Homes worth a <em>closer look.</em>
                </h2>
              </div>
              <Button asChild variant="outline" className="outline-cta">
                <Link to="/properties">
                  Explore all homes <ArrowUpRight size={16} />
                </Link>
              </Button>
            </div>
          </Reveal>
          {isLoading ? (
            <div className="homepage-state">
              <LoaderCircle size={24} className="spin" />
              <span>Loading live homes…</span>
            </div>
          ) : isError ? (
            <div className="homepage-state homepage-state-error">
              <strong>Homes are temporarily unavailable.</strong>
              <span>Please try again in a moment.</span>
              <Link to="/properties">
                Open property search <ArrowUpRight size={15} />
              </Link>
            </div>
          ) : featured.length === 0 ? (
            <div className="homepage-state homepage-state-empty">
              <strong>No live homes yet.</strong>
              <span>Be the first to list a property on HouseProvider.</span>
              <Link to="/list-property">
                List your property <ArrowUpRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="home-grid">
              {featured.map((home, i) => (
                <Reveal key={home.slug} delay={i * 0.07}>
                  <HomeTile home={home} listing={home} />
                </Reveal>
              ))}
            </div>
          )}
          {/* {!isLoading && !isError && featured.length > 0 && <p className="collection-note">Featured listings are promoted placements and are clearly labelled. Availability and verification status come from listing records.</p>} */}
          {!isLoading && !isError && promoted.length > 0 && (
            <p className="collection-note">
              🔥 Featured Properties · {promoted.length} promoted placement
              {promoted.length === 1 ? "" : "s"}.
            </p>
          )}
          {!isLoading && !isError && boosted.length > 0 && (
            <p className="collection-note">
              ⭐ Promoted Listings · {boosted.length} boosted listing
              {boosted.length === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      </section>

      {loadShowcase ? (
        <Suspense fallback={<div className="story-band" aria-hidden="true" />}>
          <HomepageShowcase listings={liveListings} />
        </Suspense>
      ) : (
        <div ref={showcaseSentinel} aria-hidden="true" style={{ minHeight: 1 }} />
      )}

      <section className="seo-discovery-section" aria-labelledby="home-search-guides">
        <div className="wrap">
          <p className="kicker">FIND YOUR NEXT HOME</p>
          <h2 id="home-search-guides">Explore homes by what you need</h2>
          <p>HouseProvider helps you explore available homes, compare property details and contact owners or agents. Start with your budget and preferred location, then review each listing’s photos, amenities and availability before making a decision.</p>
          <div className="fallback-actions">
            <Link to="/properties" search={{ mode: "Rent" }} className="text-link">Explore homes for rent</Link>
            <Link to="/properties" search={{ mode: "Buy" }} className="text-link">Explore homes for sale</Link>
            <Link to="/flats-in-nagpur" className="text-link">Explore flats in Nagpur</Link>
            <Link to="/list-property" className="text-link">List your property</Link>
          </div>
          <div className="seo-guide-copy">
            <h3>What to check before choosing a property</h3>
            <p>Compare the total rent or asking price, location and commute, number of bedrooms, furnishing, parking and other amenities. Confirm deposit, maintenance charges, ownership or authority to rent, move-in date and all terms directly with the owner or authorised agent before paying.</p>
            <h3>How to find a home that fits your budget</h3>
            <p>Use the property search filters to narrow results by location, budget and BHK. Open individual listings for the available photos and details, and verify availability and final terms with the advertiser because prices and availability can change.</p>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap final-inner">
          <div className="final-copy">
            <p className="kicker">YOUR NEXT CHAPTER</p>
            <h2>
              Good things start
              <br />
              <em>with a place.</em>
            </h2>
            <p>Find a home that fits the way you want to live.</p>
          </div>
          <Button asChild className="final-button">
            <Link to="/properties">
              Explore live homes <ArrowUpRight size={18} />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
