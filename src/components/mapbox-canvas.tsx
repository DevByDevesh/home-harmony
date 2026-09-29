import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import mapboxgl, { type Map, type Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayPrice, type Listing } from "@/lib/catalog";
import { findMapPlace } from "@/lib/map-geocoding.functions";

type Props = { homes: Listing[]; selected: string | null; hovered: string | null; onSelect: (slug: string) => void; onHover: (slug: string | null) => void; layer: "map" | "satellite" };
const token = import.meta.env['VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN'];
const styleFor = (layer: Props["layer"]) => layer === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/streets-v12";
const short = (h: Listing) => h.mode === "Rent" ? `₹${Math.round(h.price / 1000)}K` : `₹${(h.price / 10000000).toFixed(1)}Cr`;
const hasCoordinates = (h: Listing) => Number.isFinite(h.lat) && Number.isFinite(h.lng) && Math.abs(h.lat) <= 90 && Math.abs(h.lng) <= 180 && !(h.lat === 0 && h.lng === 0);
type PointProps = { slug: string };

export default function MapboxCanvas({ homes, selected, hovered, onSelect, onHover, layer }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markers = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const callbacks = useRef({ onSelect, onHover });
  const searchSequence = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [placeStatus, setPlaceStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [ready, setReady] = useState(false);
  const mappedHomes = useMemo(() => homes.filter(hasCoordinates), [homes]);
  const bySlug = useMemo(() => new globalThis.Map(mappedHomes.map(home => [home.slug, home])), [mappedHomes]);
  const clusterIndex = useMemo(() => new Supercluster<PointProps>({ radius: 60, maxZoom: 14 }).load(mappedHomes.map(home => ({
    type: "Feature" as const, properties: { slug: home.slug }, geometry: { type: "Point" as const, coordinates: [home.lng, home.lat] },
  }))), [mappedHomes]);
  const preview = homes.find(h => h.slug === (hovered ?? selected));

  async function searchPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = place.trim();
    if (query.length < 2) { setPlaceStatus("Enter a city or locality."); return; }
    const sequence = ++searchSequence.current;
    setSearching(true);
    setPlaceStatus("");
    try {
      const location = await findMapPlace({ data: { query } });
      if (sequence !== searchSequence.current) return;
      if (!location) { setPlaceStatus("Location not found. Try another city or locality."); return; }
      const instance = map.current;
      if (instance) {
        const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
        if (location.bbox) instance.fitBounds([[location.bbox[0], location.bbox[1]], [location.bbox[2], location.bbox[3]]], { padding: 50, maxZoom: 12, duration });
        else instance.easeTo({ center: [location.lng, location.lat], zoom: 11, duration });
      }
      setPlaceStatus(`Map centered on ${location.name}.`);
    } catch { if (sequence === searchSequence.current) setPlaceStatus("Location search is unavailable right now."); }
    finally { if (sequence === searchSequence.current) setSearching(false); }
  }

  useEffect(() => { callbacks.current = { onSelect, onHover }; }, [onSelect, onHover]);

  useEffect(() => {
    if (!container.current || !token) { if (!token) setError("Mapbox map is unavailable right now."); return; }
    mapboxgl.accessToken = token;
    if (!mapboxgl.supported()) { setError("This browser cannot display the map."); return; }
    const instance = new mapboxgl.Map({ container: container.current, style: styleFor(layer), center: [78.9629, 20.5937], zoom: 4, pitch: 0, bearing: 0, attributionControl: true });
    map.current = instance;
    instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    instance.on("load", () => setReady(true));
    instance.on("error", e => { setError(e.error?.message ?? "Map could not load."); });
    return () => { markers.current.forEach(marker => marker.remove()); markers.current.clear(); map.current = null; instance.remove(); };
    // The map instance is created once; style and markers are updated separately.
  }, []);

  useEffect(() => { if (map.current && ready) { setError(null); map.current.setStyle(styleFor(layer)); } }, [layer, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready) return;
    const draw = () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      const bounds = instance.getBounds();
      if (!bounds) return;
      const visible = clusterIndex.getClusters([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], Math.floor(instance.getZoom()));
      for (const feature of visible) {
        const [lng, lat] = feature.geometry.coordinates;
        if (lng === undefined || lat === undefined) continue;
        const element = document.createElement("button");
        element.type = "button";
        if ("cluster" in feature.properties) {
          const { cluster_id, point_count } = feature.properties;
          element.className = "property-map-cluster";
          element.textContent = String(point_count);
          element.setAttribute("aria-label", `${point_count} homes in this area. Zoom in.`);
          element.dataset['count'] = String(point_count);
          element.addEventListener("click", () => instance.easeTo({ center: [lng, lat], zoom: Math.min(clusterIndex.getClusterExpansionZoom(cluster_id), 18), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 }));
          markers.current.set(`cluster-${cluster_id}`, new mapboxgl.Marker({ element, anchor: "center" }).setLngLat([lng, lat]).addTo(instance));
        } else {
          const home = bySlug.get(feature.properties.slug);
          if (!home) continue;
          element.className = `property-map-marker${home.slug === selected ? " selected" : ""}${home.slug === hovered ? " hovered" : ""}`;
          element.textContent = short(home);
          element.setAttribute("aria-label", `${home.name}, ${home.neighborhood}, ${home.city}, ${displayPrice(home)}`);
          element.setAttribute("aria-pressed", String(home.slug === selected));
          element.dataset['slug'] = home.slug;
          element.addEventListener("click", () => callbacks.current.onSelect(home.slug));
          element.addEventListener("mouseenter", () => callbacks.current.onHover(home.slug));
          element.addEventListener("mouseleave", () => callbacks.current.onHover(null));
          element.addEventListener("focus", () => callbacks.current.onHover(home.slug));
          element.addEventListener("blur", () => callbacks.current.onHover(null));
          markers.current.set(home.slug, new mapboxgl.Marker({ element, anchor: "center" }).setLngLat([lng, lat]).addTo(instance));
        }
      }
    };
    instance.on("moveend", draw);
    const all = new mapboxgl.LngLatBounds();
    mappedHomes.forEach(home => all.extend([home.lng, home.lat]));
    if (mappedHomes.length > 1) instance.fitBounds(all, { padding: 70, maxZoom: 12, duration: 0 });
    else if (mappedHomes.length === 1) { const home = mappedHomes[0]; if (home) instance.easeTo({ center: [home.lng, home.lat], zoom: 11, duration: 0 }); }
    draw();
    return () => { instance.off("moveend", draw); markers.current.forEach(marker => marker.remove()); markers.current.clear(); };
  }, [mappedHomes, bySlug, clusterIndex, ready]);

  useEffect(() => {
    markers.current.forEach((marker, slug) => {
      marker.getElement().classList.toggle("selected", slug === selected);
      marker.getElement().classList.toggle("hovered", slug === hovered);
      marker.getElement().setAttribute("aria-pressed", String(slug === selected));
    });
  }, [selected, hovered, mappedHomes, ready]);

  useEffect(() => {
    const home = mappedHomes.find(item => item.slug === selected);
    if (home && map.current && ready) map.current.easeTo({ center: [home.lng, home.lat], zoom: Math.max(map.current.getZoom(), 16), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
  }, [selected, mappedHomes, ready]);

  return <div className="property-map" role="region" aria-label="Map of listed homes">
    <div ref={container} className="property-map-canvas" aria-label="Mapbox map"/>
    <form className="property-map-search" onSubmit={searchPlace} role="search" aria-label="Find a place on the map"><input value={place} onChange={event => setPlace(event.target.value)} placeholder="City or locality" aria-label="City or locality on map" maxLength={100}/><Button size="icon" type="submit" variant="outline" disabled={searching} title="Find on map" aria-label="Find on map"><Search size={16}/></Button></form>
    {placeStatus && <div className="property-map-status" role="status">{placeStatus}</div>}
    {error && <div className="map-empty" role="alert">{error}</div>}
    {!error && !homes.length && <div className="map-empty">No homes to place on the map. Try clearing a filter.</div>}
    {!error && homes.length > mappedHomes.length && <div className="map-badge">{homes.length - mappedHomes.length} {homes.length - mappedHomes.length === 1 ? "home has" : "homes have"} no map location</div>}
    {preview && <Link key={preview.slug} to="/property/$slug" params={{ slug: preview.slug }} className="map-preview"><img src={preview.image} alt="" width={96} height={76}/><span><small>{preview.neighborhood}, {preview.city}</small><strong>{preview.name}</strong><em>{displayPrice(preview)}{preview.mode === "Rent" ? " / month" : ""} · {preview.beds} BHK</em></span></Link>}
  </div>;
}