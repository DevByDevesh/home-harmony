import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, { type Map, type Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { displayPrice, type Listing } from "@/lib/catalog";

type Props = { homes: Listing[]; selected: string | null; hovered: string | null; onSelect: (slug: string) => void; onHover: (slug: string | null) => void; layer: "map" | "satellite" };
const token = import.meta.env['VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN'];
const styleFor = (layer: Props["layer"]) => layer === "satellite" ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/streets-v12";
const short = (h: Listing) => h.mode === "Rent" ? `₹${Math.round(h.price / 1000)}K` : `₹${(h.price / 10000000).toFixed(1)}Cr`;
const hasCoordinates = (h: Listing) => Number.isFinite(h.lat) && Number.isFinite(h.lng) && Math.abs(h.lat) <= 90 && Math.abs(h.lng) <= 180 && !(h.lat === 0 && h.lng === 0);

export default function MapboxCanvas({ homes, selected, hovered, onSelect, onHover, layer }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const markers = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const callbacks = useRef({ onSelect, onHover });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const mappedHomes = useMemo(() => homes.filter(hasCoordinates), [homes]);
  const preview = homes.find(h => h.slug === (hovered ?? selected));

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
    markers.current.forEach(marker => marker.remove());
    markers.current.clear();
    const bounds = new mapboxgl.LngLatBounds();
    for (const home of mappedHomes) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "property-map-marker";
      element.textContent = short(home);
      element.setAttribute("aria-label", `${home.name}, ${home.neighborhood}, ${home.city}, ${displayPrice(home)}`);
      element.dataset['slug'] = home.slug;
      element.addEventListener("click", () => callbacks.current.onSelect(home.slug));
      element.addEventListener("mouseenter", () => callbacks.current.onHover(home.slug));
      element.addEventListener("mouseleave", () => callbacks.current.onHover(null));
      element.addEventListener("focus", () => callbacks.current.onHover(home.slug));
      element.addEventListener("blur", () => callbacks.current.onHover(null));
      markers.current.set(home.slug, new mapboxgl.Marker({ element, anchor: "center" }).setLngLat([home.lng, home.lat]).addTo(instance));
      bounds.extend([home.lng, home.lat]);
    }
    const onlyHome = mappedHomes[0];
    if (mappedHomes.length === 1 && onlyHome) instance.easeTo({ center: [onlyHome.lng, onlyHome.lat], zoom: 11, duration: 0 });
    else if (mappedHomes.length > 1) instance.fitBounds(bounds, { padding: 70, maxZoom: 12, duration: 0 });
    return () => { markers.current.forEach(marker => marker.remove()); markers.current.clear(); };
  }, [mappedHomes, ready]);

  useEffect(() => {
    markers.current.forEach((marker, slug) => {
      marker.getElement().classList.toggle("selected", slug === selected);
      marker.getElement().classList.toggle("hovered", slug === hovered);
      marker.getElement().setAttribute("aria-pressed", String(slug === selected));
    });
  }, [selected, hovered, mappedHomes, ready]);

  return <div className="property-map" role="region" aria-label="Map of listed homes">
    <div ref={container} className="property-map-canvas" aria-label="Mapbox map"/>
    {error && <div className="map-empty" role="alert">{error}</div>}
    {!error && !homes.length && <div className="map-empty">No homes to place on the map. Try clearing a filter.</div>}
    {!error && homes.length > mappedHomes.length && <div className="map-badge">{homes.length - mappedHomes.length} {homes.length - mappedHomes.length === 1 ? "home has" : "homes have"} no map location</div>}
    {preview && <Link key={preview.slug} to="/property/$slug" params={{ slug: preview.slug }} className="map-preview"><img src={preview.image} alt="" width={96} height={76}/><span><small>{preview.neighborhood}, {preview.city}</small><strong>{preview.name}</strong><em>{displayPrice(preview)}{preview.mode === "Rent" ? " / month" : ""} · {preview.beds} BHK</em></span></Link>}
  </div>;
}