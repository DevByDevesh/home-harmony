import { createFileRoute } from "@tanstack/react-router";
import { isDatabaseConfigured, requireDb } from "@/lib/db/client.server";

const ORIGIN = "https://houseprovider.in";
const STATIC_URLS = ["/", "/properties", "/flats-in-nagpur", "/flats-for-rent-in-nagpur", "/flats-for-sale-in-nagpur", "/rooms-for-rent-in-nagpur", "/pg-in-nagpur", "/apartments-in-nagpur", "/houses-for-rent-in-nagpur", "/commercial-property-in-nagpur", "/list-property", "/support"];

function xmlEscape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function sitemapResponse(urls: Array<{ loc: string; lastmod?: string }>) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(({ loc, lastmod }) => `  <url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("\n") +
    "\n</urlset>\n";
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
      "x-content-type-options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: Array<{ loc: string; lastmod?: string }> = STATIC_URLS.map((path) => ({ loc: `${ORIGIN}${path}` }));

        // Never publish fictional demo catalog entries in a production sitemap.
        if (isDatabaseConfigured()) {
          try {
            const db = await requireDb();
            const properties = await db.property.findMany({
              where: { status: "ACTIVE", images: { some: {} } },
              select: { slug: true, updatedAt: true },
              orderBy: { updatedAt: "desc" },
              take: 50000,
            });
            for (const property of properties) {
              if (!property.slug || !property.updatedAt) continue;
              urls.push({
                loc: `${ORIGIN}/property/${encodeURIComponent(property.slug)}`,
                lastmod: new Date(property.updatedAt).toISOString().slice(0, 10),
              });
            }
          } catch (error) {
            // Keep core public URLs available if the listing database is temporarily unavailable.
            console.error("[sitemap] Could not load active property URLs:", error);
          }
        }

        return sitemapResponse(urls);
      },
    },
  },
});
