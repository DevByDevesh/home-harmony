import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const findMapPlace = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => z.object({ query: z.string().trim().min(2).max(100) }).strict().parse(value))
  .handler(async ({ data }) => {
    // Geocoding uses the same Mapbox public token already used by the map itself.
    // No Lovable gateway or second secret is required for location search.
    const token = process.env["VITE_MAPBOX_PUBLIC_TOKEN"] ?? process.env["VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN"];
    if (!token) throw new Error("Map location search is unavailable right now.");

    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.query)}.json`,
    );
    url.searchParams.set("access_token", token);
    url.searchParams.set("country", "IN");
    url.searchParams.set("types", "place,locality,neighborhood,district");
    url.searchParams.set("limit", "1");
    url.searchParams.set("autocomplete", "false");

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      console.error(`Mapbox geocoding failed [${response.status}]: ${body}`);
      throw new Error("Mapbox location search failed.");
    }

    const payload = await response.json() as {
      features?: Array<{
        place_name?: string;
        center?: number[];
        bbox?: number[];
      }>;
    };

    const match = payload.features?.[0];
    const center = match?.center;
    const lng = center?.[0];
    const lat = center?.[1];

    if (
      lng === undefined ||
      lat === undefined ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return null;
    }

    const bbox = match?.bbox;

    return {
      name: match?.place_name ?? data.query,
      lng,
      lat,
      bbox:
        bbox?.length === 4 && bbox.every(Number.isFinite)
          ? (bbox as [number, number, number, number])
          : null,
    };
  });
