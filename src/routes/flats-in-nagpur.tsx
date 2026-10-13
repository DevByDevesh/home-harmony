import { createFileRoute, Link } from "@tanstack/react-router";
import { listPropertiesFn } from "@/lib/properties.functions";
import { toListing } from "@/lib/property-mapper";
import { displayPrice } from "@/lib/catalog";
import { isDatabaseConfigured } from "@/lib/db/client.server";

export const Route = createFileRoute("/flats-in-nagpur")({
  loader: async () => {
    if (!isDatabaseConfigured()) return [];
    const rows = await listPropertiesFn({ data: { city: "Nagpur", take: 100 } });
    return rows.map(toListing);
  },
  head: () => ({
    meta: [
      { title: "Flats in Nagpur for Rent & Sale | HouseProvider.in" },
      { name: "description", content: "Explore available flats and homes in Nagpur on HouseProvider.in. Compare real listings by rent or sale price, bedrooms, locality and amenities." },
      { property: "og:title", content: "Flats in Nagpur for Rent & Sale | HouseProvider.in" },
      { property: "og:description", content: "Explore available flats and homes in Nagpur. Compare listings by price, bedrooms, locality and amenities." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://houseprovider.in/flats-in-nagpur" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Flats in Nagpur for Rent & Sale | HouseProvider.in" },
      { name: "twitter:description", content: "Browse Nagpur property listings by rent or sale price, bedrooms, locality and amenities." },
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
        <p>Explore property listings in Nagpur and compare the details that matter: budget, bedrooms, locality, furnishing and amenities. Open an individual listing to review its photos and property information before contacting the owner or agent.</p>
        <div className="fallback-actions">
          <Link to="/properties" className="text-link">Browse all properties</Link>
          <Link to="/list-property" className="text-link">List a property</Link>
        </div>
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
                    <p><strong>{displayPrice(home.price, home.mode)}</strong> · {home.beds} BHK · {home.area.toLocaleString("en-IN")} sq ft</p>
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
