import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual, createHash } from "crypto";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const digest = (s: string) => createHash("sha256").update(s).digest();

export const Route = createFileRoute("/api/public/expire-listings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LISTING_EXPIRY_CRON_SECRET"];
        const given = request.headers.get("x-cron-secret") ?? "";
        if (!secret || secret.length < 24 || !timingSafeEqual(digest(given), digest(secret))) {
          return json(401, { ok: false, message: "Not authorised." });
        }

        const { expireListings, purgeExpiredListings, LISTING_VALIDITY_DAYS, LISTING_REPOST_WINDOW_DAYS } = await import("@/lib/db/repositories/properties.server");
        const expired = await expireListings();
        const purged = await purgeExpiredListings();
        return json(200, {
          ok: true,
          expired: expired.count,
          purged: purged.count,
          validityDays: LISTING_VALIDITY_DAYS,
          repostWindowDays: LISTING_REPOST_WINDOW_DAYS,
        });
      },
    },
  },
});
