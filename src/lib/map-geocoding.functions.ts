import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const findMapPlace = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => z.object({ query: z.string().trim().min(2).max(100) }).strict().parse(value))
  .handler(async ({ data }) => {
    const apiKey = process.env['MAPBOX_API_KEY'];
    const lovableKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey || !lovableKey) throw new Error("Map location search is unavailable right now.");
    // Only the visitor's city/locality query is sent. Property records and addresses never leave this app.
    const url = `https://connector-gateway.lovable.dev/mapbox/geocoding/v5/mapbox.places/${encodeURIComponent(data.query)}.json?country=in&types=place,locality,neighborhood,district&limit=1&autocomplete=false`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": apiKey } });
    if (!response.ok) {
      const body = await response.text();
      console.error(`Mapbox geocoding failed [${response.status}]: ${body}`);
      throw new Error(`Mapbox location search failed [${response.status}]: ${body}`);
    }
    const payload = await response.json() as { features?: Array<{ place_name?: string; center?: number[]; bbox?: number[] }> };
    const match = payload.features?.[0];
    const center = match?.center;
    if (!center || center.length < 2 || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) return null;
    const bbox = match?.bbox;
    return { name: match?.place_name ?? data.query, lng: center[0], lat: center[1],
      bbox: bbox?.length === 4 && bbox.every(Number.isFinite) ? bbox as [number, number, number, number] : null };
  });