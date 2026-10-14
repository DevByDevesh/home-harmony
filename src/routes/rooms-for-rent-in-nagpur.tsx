import { createFileRoute, Link } from "@tanstack/react-router";
import { listLivePropertiesByCityFn } from "@/lib/properties.functions";
import { toListing } from "@/lib/property-mapper";
import { formatDisplayPrice } from "@/lib/price-format";

export const Route = createFileRoute("/rooms-for-rent-in-nagpur")({
  loader: async () => (await listLivePropertiesByCityFn({ data: { city: "Nagpur", propertyType: "ROOM", listingType: "RENT" } })).map(toListing),
  head: () => ({
    meta: [
      { title: "Rooms for Rent in Nagpur | HouseProvider.in" },
      { name: "description", content: "Find rooms for rent in Nagpur. Compare available private rooms and shared accommodation by rent, locality and amenities on HouseProvider.in." },
      { property: "og:title", content: "Rooms for Rent in Nagpur | HouseProvider.in" },
      { property: "og:description", content: "Find rooms for rent in Nagpur. Compare available private rooms and shared accommodation by rent, locality and amenities on HouseProvider.in." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://houseprovider.in/rooms-for-rent-in-nagpur" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Rooms for Rent in Nagpur | HouseProvider.in" },
      { name: "twitter:description", content: "Find rooms for rent in Nagpur. Compare available private rooms and shared accommodation by rent, locality and amenities on HouseProvider.in." },
    ],
    links: [{ rel: "canonical", href: "https://houseprovider.in/rooms-for-rent-in-nagpur" }],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const listings = Route.useLoaderData();
  return <main className="results-page"><div className="wrap">
    <p className="kicker">NAGPUR PROPERTY GUIDE</p>
    <h1>Rooms for Rent in Nagpur</h1>
    <p>Explore room rental options in Nagpur and compare rent, locality, furnishing, shared facilities and move-in terms. Confirm whether the room is private or shared and which utilities are included.</p>
    <div className="fallback-actions">
      <Link to="/properties" search={{ location: "Nagpur" }} className="text-link">Browse all Nagpur properties</Link>
      <Link to="/flats-in-nagpur" className="text-link">Explore flats in Nagpur</Link>
      <Link to="/pg-in-nagpur" className="text-link">Explore PG accommodation</Link>
      <Link to="/flats-for-rent-in-nagpur" className="text-link">Flats for rent</Link>
      <Link to="/list-property" className="text-link">List your property</Link>
    </div>
    <section className="seo-guide-copy"><h2>Rooms for rent in Nagpur</h2><p>Explore room rental options in Nagpur and compare rent, locality, furnishing, shared facilities and move-in terms. Confirm whether the room is private or shared and which utilities are included.</p>
      <h2>What to check before choosing</h2><p>Before renting a room, confirm occupancy rules, bathroom and kitchen access, electricity and internet charges, deposit, notice period, visitor rules and the written rental terms.</p>
      <h2>Explore Nagpur localities</h2><p>Search around the areas that fit your commute and budget, such as Manish Nagar, Besa, Beltarodi, MIHAN, Wardha Road, Dharampeth, Trimurti Nagar, Hingna, Sadar and Civil Lines. These are locality examples, not a claim that a listing is currently available in each area.</p>
    </section>
    {listings.length ? <section aria-label="Available room listings in Nagpur" className="nagpur-listings"><h2>Available room listings in Nagpur</h2><div className="property-grid">{listings.map((home) => <article key={home.slug} className="home-tile">
      <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-image" aria-label={`View ${home.name}`}><img src={home.image} alt={`${home.kind} in ${home.neighborhood}, Nagpur`} width={1008} height={768} loading="lazy" /></Link>
      <div className="tile-content"><p className="kicker">{home.mode === "Rent" ? "FOR RENT" : "FOR SALE"} · {home.kind}</p><h3><Link to="/property/$slug" params={{ slug: home.slug }}>{home.name}</Link></h3><p>{home.neighborhood}, Nagpur</p><p><strong>{formatDisplayPrice(home.mode, home.price)}</strong> · {home.beds} BHK · {home.area.toLocaleString("en-IN")} sq ft</p></div>
    </article>)}</div></section> : <section className="empty-state" aria-live="polite"><h2>No live room listings in Nagpur right now</h2><p>Check the full property search for current availability. This page shows listings only when matching live properties are published.</p><Link to="/properties" search={{ location: "Nagpur" }} className="text-link">Search Nagpur properties</Link></section>}
  </div></main>;
}
