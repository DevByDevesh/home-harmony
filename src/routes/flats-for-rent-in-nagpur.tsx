import { createFileRoute, Link } from "@tanstack/react-router";
import { listLivePropertiesByCityFn } from "@/lib/properties.functions";
import { toListing } from "@/lib/property-mapper";
import { formatDisplayPrice } from "@/lib/price-format";

export const Route = createFileRoute("/flats-for-rent-in-nagpur")({
  loader: async () => (await listLivePropertiesByCityFn({ data: { city: "Nagpur", propertyType: "APARTMENT", listingType: "RENT" } })).map(toListing),
  head: () => ({
    meta: [
      { title: "Flats for Rent in Nagpur | Houses & 1, 2, 3 BHK | HouseProvider.in" },
      { name: "description", content: "Explore flats and houses for rent in Nagpur. Compare available 1 BHK, 2 BHK and 3 BHK homes by locality, rent, furnishing and amenities on HouseProvider.in." },
      { property: "og:title", content: "Flats for Rent in Nagpur | HouseProvider.in" },
      { property: "og:description", content: "Compare available rental homes in Nagpur by rent, BHK, locality and amenities." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://houseprovider.in/flats-for-rent-in-nagpur" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Flats for Rent in Nagpur | HouseProvider.in" },
      { name: "twitter:description", content: "Find rental flats and houses in Nagpur by budget, BHK and locality." },
    ],
    links: [{ rel: "canonical", href: "https://houseprovider.in/flats-for-rent-in-nagpur" }],
  }),
  component: NagpurRentPage,
});

function NagpurRentPage() {
  const listings = Route.useLoaderData();
  return (
    <main className="results-page"><div className="wrap">
      <p className="kicker">NAGPUR RENTAL GUIDE</p>
      <h1>Flats and Houses for Rent in Nagpur</h1>
      <p>Explore rental homes in Nagpur and compare the monthly rent, BHK, locality, furnishing, parking and amenities. Availability changes as owners publish or rent out properties, so confirm the latest details directly with the advertiser.</p>
      <div className="fallback-actions">
        <Link to="/properties" search={{ location: "Nagpur", mode: "Rent" }} className="text-link">Search rental homes in Nagpur</Link>
        <Link to="/flats-in-nagpur" className="text-link">All Nagpur properties</Link>
        <Link to="/list-property" className="text-link">List a rental property</Link>
      </div>
      <section className="seo-guide-copy">
        <h2>Choose a rental home that fits your budget</h2>
        <p>When comparing flats for rent in Nagpur, review the monthly rent alongside the security deposit, maintenance charges, agreement duration, notice period and move-in date. Check whether the home is furnished or unfurnished and confirm which appliances or parking spaces are included.</p>
        <h2>Search across Nagpur neighbourhoods</h2>
        <p>Depending on your commute and budget, you may want to search localities such as Manish Nagar, Besa, Beltarodi, MIHAN, Wardha Road, Dharampeth, Trimurti Nagar, Hingna, Sadar and Civil Lines. These are examples of areas to explore, not a statement that listings are currently available in each one.</p>
        <h2>Questions to ask before renting</h2>
        <p>Confirm who is authorised to rent the property, the total amount due before move-in, utility and maintenance responsibilities, visitor and parking rules, and the written agreement terms. Visit the home where possible and keep payment receipts.</p>
      </section>
      {listings.length ? <section aria-label="Available rental homes in Nagpur" className="nagpur-listings">
        <h2>Available rental homes in Nagpur</h2><div className="property-grid">{listings.map((home) => <article key={home.slug} className="home-tile">
          <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-image" aria-label={`View ${home.name}`}><img src={home.image} alt={`${home.kind} for rent in ${home.neighborhood}, Nagpur`} width={1008} height={768} loading="lazy" /></Link>
          <div className="tile-content"><p className="kicker">FOR RENT · {home.kind}</p><h3><Link to="/property/$slug" params={{ slug: home.slug }}>{home.name}</Link></h3><p>{home.neighborhood}, Nagpur</p><p><strong>{formatDisplayPrice(home.mode, home.price)}</strong> · {home.beds} BHK · {home.area.toLocaleString("en-IN")} sq ft</p></div>
        </article>)}</div>
      </section> : <section className="empty-state" aria-live="polite"><h2>No live rental listings in Nagpur right now</h2><p>Try the full search for the latest available homes, or check back when new rental properties are published.</p><Link to="/properties" search={{ location: "Nagpur", mode: "Rent" }} className="text-link">Search Nagpur rentals</Link></section>}
    </div></main>
  );
}
