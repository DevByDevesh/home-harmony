import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Cross, GraduationCap, MapPin, Navigation, Search, ShoppingBag, Utensils, WalletCards } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Listing } from "@/lib/catalog";
import { distanceKm, withinRadius } from "@/lib/location-intelligence";
import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  label: string;
  query: string;
  icon: typeof Building2;
};

type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  distanceKm?: number;
};

const categories: Category[] = [
  { id: "school", label: "Schools", query: "school", icon: GraduationCap },
  { id: "hospital", label: "Hospitals", query: "hospital", icon: Cross },
  { id: "shopping", label: "Shopping", query: "shopping mall", icon: ShoppingBag },
  { id: "restaurant", label: "Restaurants", query: "restaurant", icon: Utensils },
  { id: "transit", label: "Public transport", query: "metro station", icon: Navigation },
  { id: "college", label: "Colleges", query: "college", icon: GraduationCap },
  { id: "bank", label: "Banks & ATMs", query: "bank ATM", icon: WalletCards },
];

const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;

function formatDistance(value: number) {
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toFixed(1)} km`;
}

async function searchPlaces(category: Category, home: Listing, signal: AbortSignal): Promise<Place[]> {
  if (!token) return [];
  const params = new URLSearchParams({
    q: category.query,
    proximity: `${home.lng},${home.lat}`,
    radius: "0.03",
    limit: "8",
    country: "IN",
    types: "poi",
    access_token: token,
  });
  const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${params}`, { signal });
  if (!response.ok) throw new Error("Nearby places could not be loaded.");
  const json = await response.json() as { features?: Array<{ id?: string; geometry?: { coordinates?: [number, number] }; properties?: { name?: string; full_address?: string } }> };
  return (json.features ?? [])
    .flatMap(feature => {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates || typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number") return [];
      const place = { id: feature.id ?? `${category.id}-${coordinates.join("-")}`, name: feature.properties?.name ?? category.label.slice(0, -1), lng: coordinates[0], lat: coordinates[1], address: feature.properties?.full_address };
      return [{ ...place, distanceKm: distanceKm(home, place) }];
    })
    .filter(place => (place.distanceKm ?? Infinity) <= 3)\n    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

async function geocodeDestination(query: string, signal: AbortSignal) {
  if (!token || !query.trim()) return null;
  const params = new URLSearchParams({
    q: query.trim(),
    proximity: "79.0882,21.1458",
    limit: "1",
    country: "IN",
    access_token: token,
  });
  const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${params}`, { signal });
  if (!response.ok) throw new Error("Destination could not be found.");
  const json = await response.json() as { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; full_address?: string } }> };
  const feature = json.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates || typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number") return null;
  return { lng: coordinates[0], lat: coordinates[1], name: feature.properties?.name ?? query.trim(), address: feature.properties?.full_address };
}

export function LocationIntelligenceMap({ home, listings }: { home: Listing; listings: Listing[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [categoryId, setCategoryId] = useState("school");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationError, setDestinationError] = useState("");
  const [destinationPoint, setDestinationPoint] = useState<{ lat: number; lng: number; name: string; address?: string } | null>(null);

  const category = categories.find(item => item.id === categoryId) ?? categories[0];
  const nearbyListings = useMemo(() => {
    if (!destinationPoint) return [];
    return withinRadius(
      listings.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng)),
      destinationPoint,
      2,
    ).slice(0, 12);
  }, [destinationPoint, listings]);

  useEffect(() => {
    if (!mapContainer.current || !token || !Number.isFinite(home.lat) || !Number.isFinite(home.lng)) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: [home.lng, home.lat],
      zoom: 14,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("load", () => {
      new mapboxgl.Marker({ color: "#542a52" })
        .setLngLat([home.lng, home.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setText(home.name))
        .addTo(map);
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [home.lat, home.lng, home.name]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingPlaces(true);
    setPlaceError("");
    searchPlaces(category, home, controller.signal)
      .then(setPlaces)
      .catch(error => {
        if (error?.name !== "AbortError") {
          setPlaces([]);
          setPlaceError("Nearby places are unavailable right now.");
        }
      })
      .finally(() => setLoadingPlaces(false));
    return () => controller.abort();
  }, [category, home]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    places.forEach(place => {
      const marker = new mapboxgl.Marker({ color: "#9b6a8f" })
        .setLngLat([place.lng, place.lat])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<strong>${place.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong><br/>${formatDistance(place.distanceKm ?? 0)} away`))
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [places]);

  const searchDestination = async () => {
    if (!destination.trim()) return;
    const controller = new AbortController();
    setDestinationError("");
    try {
      const point = await geocodeDestination(destination, controller.signal);
      if (!point) {
        setDestinationError("We couldn't find that workplace or college.");
        return;
      }
      setDestinationPoint(point);
      mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom: 13, essential: true });
    } catch {
      setDestinationError("Destination search is unavailable right now.");
    }
  };

  if (!token) {
    return <section className="property-feature-section"><div className="property-section-heading"><div><p className="kicker">LOCATION INTELLIGENCE</p><h2>Map & nearby places.</h2></div></div><p className="property-muted">Mapbox is not configured on this environment yet. Add the public map token to enable the interactive map and radius search.</p></section>;
  }

  return (
    <section className="property-feature-section location-intelligence" aria-labelledby="location-intelligence-title">
      <div className="property-section-heading">
        <div><p className="kicker">LOCATION INTELLIGENCE</p><h2 id="location-intelligence-title">See what’s close.</h2></div>
        <MapPin size={24} />
      </div>

      <div className="location-map-layout">
        <div className="location-map-panel">
          <div ref={mapContainer} className="location-map" aria-label="Interactive property location map" />
        </div>
        <div className="location-explorer">
          <div className="location-category-tabs" role="tablist" aria-label="Nearby categories">
            {categories.map(item => {
              const Icon = item.icon;
              return <button key={item.id} type="button" role="tab" aria-selected={categoryId === item.id} onClick={() => setCategoryId(item.id)}><Icon size={15}/>{item.label}</button>;
            })}
          </div>
          <div className="location-results">
            {loadingPlaces ? <p className="property-muted">Finding nearby {category.label.toLowerCase()}…</p> : placeError ? <p className="property-muted">{placeError}</p> : places.length === 0 ? <p className="property-muted">No nearby results found.</p> : places.map(place => <a key={place.id} href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`} target="_blank" rel="noreferrer"><span><strong>{place.name}</strong><small>{formatDistance(place.distanceKm ?? 0)}{place.address ? ` · ${place.address}` : ""}</small></span><Navigation size={14}/></a>)}
          </div>
        </div>
      </div>

      <div className="radius-search-card">
        <div><p className="kicker">2 KM RADIUS</p><h3>Properties near your workplace or college.</h3><p className="property-muted">Search a destination and we’ll show active listings within 2 km of that point.</p></div>
        <div className="radius-search-controls"><input value={destination} onChange={event => setDestination(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void searchDestination(); }} placeholder="e.g. VNIT Nagpur or your workplace" aria-label="Workplace or college" /><Button type="button" onClick={() => void searchDestination()}><Search size={15}/> Find properties</Button></div>
        {destinationError ? <p className="radius-error" role="alert">{destinationError}</p> : null}
        {destinationPoint ? <div className="radius-results"><div className="radius-origin"><MapPin size={16}/><span><strong>{destinationPoint.name}</strong><small>{destinationPoint.address ?? "Destination"} · 2 km radius</small></span></div>{nearbyListings.length === 0 ? <p className="property-muted">No active listings within 2 km.</p> : <div className="radius-list">{nearbyListings.map(item => <a key={item.slug} href={`/property/${item.slug}`}><span><strong>{item.name}</strong><small>{item.neighborhood}, {item.city} · {formatDistance(distanceKm(destinationPoint, item))}</small></span><Building2 size={14}/></a>)}</div>}</div> : null}
      </div>
    </section>
  );
}
