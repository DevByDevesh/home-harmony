/**
 * Map provider abstraction. A real provider (Mapbox / Google Maps) plugs in here later,
 * loading its browser-safe key from configuration. No keys live in this file.
 */
export type MapPoint = { id: string; lat: number; lng: number; label: string };
export type MapProviderInfo = { id: "demo" | "mapbox" | "google"; live: boolean; supportsSatellite: boolean; name: string };
export function getMapProvider(): MapProviderInfo {
  return { id: "demo", live: false, supportsSatellite: false, name: "Demo map" };
}
export type Cluster = { id: string; x: number; y: number; points: MapPoint[] };
/** Projects points into a 0–100 box and groups those closer than `radius` — simple grid-free clustering. */
export function clusterPoints(points: MapPoint[], radius = 5): Cluster[] {
  if (!points.length) return [];
  const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const spanLat = Math.max(maxLat - minLat, 0.5), spanLng = Math.max(maxLng - minLng, 0.5);
  const project = (p: MapPoint) => ({ x: 10 + ((p.lng - minLng) / spanLng) * 80, y: 90 - ((p.lat - minLat) / spanLat) * 80 });
  const clusters: Cluster[] = [];
  for (const p of points) {
    const { x, y } = project(p);
    const near = clusters.find(c => Math.hypot(c.x - x, c.y - y) < radius);
    if (near) { near.points.push(p); near.x = (near.x + x) / 2; near.y = (near.y + y) / 2; }
    else clusters.push({ id: p.id, x, y, points: [p] });
  }
  return clusters;
}
