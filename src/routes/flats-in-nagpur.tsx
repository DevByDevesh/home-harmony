import { createFileRoute, Link } from "@tanstack/react-router";
import { listLivePropertiesByCityFn } from "@/lib/properties.functions";
import { toListing } from "@/lib/property-mapper";
import { formatDisplayPrice } from "@/lib/price-format";

export const Route = createFileRoute("/flats-in-nagpur")({
  loader: async () => {
    const rows = await listLivePropertiesByCityFn({ data: { city: "Nagpur", propertyType: "APARTMENT" } });
    return rows.map(toListing);
  },
  head: () => ({
    meta: [
      { title: "Flats in Nagpur: Rent, Buy & Property Search | HouseProvider.in" },
      { name: "description", content: "Search flats in Nagpur for rent or sale. Compare available apartments by BHK, budget, locality, floor area and amenities on HouseProvider.in." },
      { property: "og:title", content: "Flats in Nagpur: Rent, Buy & Property Search | HouseProvider.in" },
      { property: "og:description", content: "Search flats in Nagpur for rent or sale. Compare available apartments by BHK, budget, locality, floor area and amenities on HouseProvider.in." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://houseprovider.in/flats-in-nagpur" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Flats in Nagpur: Rent, Buy & Property Search | HouseProvider.in" },
      { name: "twitter:description", content: "Search flats in Nagpur for rent or sale. Explore 1 BHK, 2 BHK and 3 BHK home options by budget, locality and amenities on HouseProvider.in." },
    ],
    links: [{ rel: "canonical", href: "https://houseprovider.in/flats-in-nagpur" }],
  }),
  component: NagpurFlatsPage,
});

function NagpurFlatsPage() {
  const listings = Route.useLoaderData();
  return (
    <main className="results-page">
      <div className="wrap">
        <p className="kicker">NAGPUR PROPERTY GUIDE</p>
        <h1>Flats in Nagpur for Rent and Sale</h1>
        <p>Explore apartment listings in Nagpur for rent or sale and compare budget, bedrooms, locality, furnishing and amenities. Open an individual listing to review its photos and property information before contacting the owner or agent.</p>
        <div className="fallback-actions">
          <Link to="/properties" className="text-link">Browse all properties</Link>
          <Link to="/flats-for-rent-in-nagpur" className="text-link">Flats for rent</Link>
          <Link to="/flats-for-sale-in-nagpur" className="text-link">Flats for sale</Link>
          <Link to="/rooms-for-rent-in-nagpur" className="text-link">Rooms for rent</Link>
          <Link to="/pg-in-nagpur" className="text-link">PG accommodation</Link>
          <Link to="/apartments-in-nagpur" className="text-link">Apartments</Link>
          <Link to="/houses-for-rent-in-nagpur" className="text-link">Houses for rent</Link>
          <Link to="/commercial-property-in-nagpur" className="text-link">Commercial property</Link>
          <Link to="/list-property" className="text-link">List a property</Link>
        </div>
        <section className="seo-guide-copy" aria-labelledby="nagpur-home-guide">
          <h2 id="nagpur-home-guide">Nagpur property search: rent, resale and homes for sale</h2>
          <p>Search phrases people may use include flats for rent in Nagpur, flats for sale in Nagpur, 1 BHK flats, 2 BHK flats, 3 BHK flats, houses for rent, resale flats and residential property in Nagpur. Availability depends on current published listings, so use the search filters and verify each property directly with its owner or authorised agent. Compare the neighbourhood, commute, rent or asking price, area, furnishing, parking and amenities before arranging a visit.</p>
          <div className="fallback-actions">
            <Link to="/properties" search={{ location: "Nagpur", mode: "Rent" }} className="text-link">Look for homes to rent in Nagpur</Link>
            <Link to="/properties" search={{ location: "Nagpur", mode: "Buy" }} className="text-link">Look for homes to buy in Nagpur</Link>
          </div>
          <h3>Explore Nagpur localities</h3>
          <p>You can narrow a property search by locality, including areas such as Dharampeth, Manish Nagar, MIHAN, Besa, Beltarodi, Wardha Road, Hingna, Trimurti Nagar, Sadar and Civil Lines. These are search examples, not a claim that a property is currently available in every area.</p>
          <h3>Before renting a flat</h3>
          <p>Confirm the monthly rent, security deposit, maintenance charges, agreement period, notice terms, furnishing inventory and move-in date. Visit the property where possible and get payment terms and commitments in writing.</p>
          <h3>Before buying a flat</h3>
          <p>Review the title and ownership documents, sanctioned plans and applicable approvals, society or maintenance costs, taxes and any outstanding dues with a qualified local professional. Do not rely on a listing alone as proof of legal status.</p>
          <h3>How HouseProvider listings work</h3>
          <p>Use the property search to compare available details and open a listing for its photos and information. HouseProvider does not replace independent checks; confirm price, availability and all important details with the advertiser before committing.</p>
        </section>
        {listings.length > 0 ? (
          <section aria-label="Available Nagpur properties" className="nagpur-listings">
            <h2>Available properties in Nagpur</h2>
            <div className="property-grid">
              {listings.map((home) => (
                <article key={home.slug} className="home-tile">
                  <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-image" aria-label={`View ${home.name}`}>
                    <img src={home.image} alt={`${home.kind} in ${home.neighborhood}, Nagpur`} width={1008} height={768} loading="lazy" />
                  </Link>
                  <div className="tile-content">
                    <p className="kicker">{home.mode === "Rent" ? "FOR RENT" : "FOR SALE"} · {home.kind}</p>
                    <h3><Link to="/property/$slug" params={{ slug: home.slug }}>{home.name}</Link></h3>
                    <p>{home.neighborhood}, Nagpur</p>
                    <p><strong>{formatDisplayPrice(home.mode, home.price)}</strong> · {home.beds} BHK · {home.area.toLocaleString("en-IN")} sq ft</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="empty-state" aria-live="polite">
            <h2>No live Nagpur listings are available right now</h2>
            <p>Check the full property search again soon. We show live listings here when owners or agents publish properties in Nagpur.</p>
            <Link to="/properties" className="text-link">Explore all listings</Link>
          </section>
        )}
      </div>
    </main>
  );
}
