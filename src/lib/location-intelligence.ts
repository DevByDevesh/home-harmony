export type Coordinates = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const latDelta = toRadians(b.lat - a.lat);
  const lngDelta = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function withinRadius<T extends Coordinates>(
  points: T[],
  origin: Coordinates,
  radiusKm: number,
): T[] {
  if (!Number.isFinite(radiusKm) || radiusKm < 0) return [];

  return points
    .map(point => ({ point, distance: distanceKm(origin, point) }))
    .filter(item => item.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.point);
}
