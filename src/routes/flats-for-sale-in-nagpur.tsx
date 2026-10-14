import { createFileRoute, Link } from "@tanstack/react-router";
import { listLivePropertiesByCityFn } from "@/lib/properties.functions";
import { toListing } from "@/lib/property-mapper";
import { formatDisplayPrice } from "@/lib/price-format";

export const Route = createFileRoute("/flats-for-sale-in-nagpur")({
  loader: async () => (await listLivePropertiesByCityFn({ data: { city: "Nagpur" } })).map(toListing).filter((home) => home.mode === "Buy"),
  head: () => ({
    meta: [
      { title: "Flats for Sale in Nagpur | Buy Homes & Resale Flats | HouseProvider.in" },
      { name: "description", content: "Explore flats and houses for sale in Nagpur. Compare available 1 BHK, 2 BHK and 3 BHK homes by asking price, locality, area and amenities on HouseProvider.in." },
      { property: "og:title", content: "Flats for Sale in Nagpur | HouseProvider.in" },
      { property: "og:description", content: "Explore homes for sale and resale flats in Nagpur by budget, BHK, locality and amenities." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://houseprovider.in/flats-for-sale-in-nagpur" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Flats for Sale in Nagpur | HouseProvider.in" },
      { name: "twitter:description", content: "Compare available homes for sale in Nagpur by price, BHK and locality." },
    ],
    links: [{ rel: "canonical", href: "https://houseprovider.in/flats-for-sale-in-nagpur" }],
  }),
  component: NagpurSalePage,
});

function NagpurSalePage() {
  const listings = Route.useLoaderData();
  return (
    <main className="results-page"><div className="wrap">
      <p className="kicker">NAGPUR BUYER GUIDE</p>
      <h1>Flats and Houses for Sale in Nagpur</h1>
      <p>Explore residential properties for sale in Nagpur and compare asking price, BHK, locality, area, furnishing and amenities. Listing information can change; verify the current price and property documents independently before making a purchase decision.</p>
      <div className="fallback-actions">
        <Link to="/properties" search={{ location: "Nagpur", mode: "Buy" }} className="text-link">Search homes for sale in Nagpur</Link>
        <Link to="/flats-in-nagpur" className="text-link">All Nagpur properties</Link>
        <Link to="/list-property" className="text-link">List a property for sale</Link>
      </div>
      <section className="seo-guide-copy">
        <h2>Compare flats, houses and resale properties</h2>
        <p>When searching for flats for sale in Nagpur, compare the asking price, carpet or built-up area, building age, parking, maintenance costs and access to work, schools and daily services. Confirm whether the property is new or resale and ask which fixtures or amenities are included.</p>
        <h2>Explore Nagpur localities</h2>
        <p>Depending on your needs, research areas such as MIHAN, Besa, Manish Nagar, Beltarodi, Wardha Road, Dharampeth, Trimurti Nagar, Hingna, Sadar and Civil Lines. These are locality examples only; actual inventory varies and should be checked in current search results.</p>
        <h2>Checks before buying a property</h2>
        <p>Ask a qualified local property professional to review title and ownership records, applicable approvals, sanctioned plans, society or maintenance dues, taxes and any encumbrances. Confirm the seller’s authority and obtain written terms before paying a token amount.</p>
      </section>
      {listings.length ? <section aria-label="Available properties for sale in Nagpur" className="nagpur-listings">
        <h2>Available properties for sale in Nagpur</h2><div className="property-grid">{listings.map((home) => <article key={home.slug} className="home-tile">
          <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-image" aria-label={`View ${home.name}`}><img src={home.image} alt={`${home.kind} for sale in ${home.neighborhood}, Nagpur`} width={1008} height={768} loading="lazy" /></Link>
          <div className="tile-content"><p className="kicker">FOR SALE · {home.kind}</p><h3><Link to="/property/$slug" params={{ slug: home.slug }}>{home.name}</Link></h3><p>{home.neighborhood}, Nagpur</p><p><strong>{formatDisplayPrice(home.mode, home.price)}</strong> · {home.beds} BHK · {home.area.toLocaleString("en-IN")} sq ft</p></div>
        </article>)}</div>
      </section> : <section className="empty-state" aria-live="polite"><h2>No live sale listings in Nagpur right now</h2><p>Try the full search for the latest available properties, or check back when new homes are published.</p><Link to="/properties" search={{ location: "Nagpur", mode: "Buy" }} className="text-link">Search Nagpur properties for sale</Link></section>}
    </div></main>
  );
}
