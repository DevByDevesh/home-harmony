import { Link } from "@tanstack/react-router";
import { Info, Satellite } from "lucide-react";
import { useMemo, useState } from "react";
import { displayPrice, type Listing } from "@/lib/catalog";
import { clusterPoints, getMapProvider } from "@/lib/map-provider";

type Props = { homes: Listing[]; selected: string | null; hovered: string | null; onSelect: (slug: string) => void; onHover: (slug: string | null) => void; layer: "map" | "satellite" };
const short = (h: Listing) => h.mode === "Rent" ? `₹${Math.round(h.price / 1000)}K` : `₹${(h.price / 10000000).toFixed(1)}Cr`;

/** Demo map canvas. Positions are relative, not geographic tiles — clearly labelled until a provider is connected. */
export function DemoMap({ homes, selected, hovered, onSelect, onHover, layer }: Props) {
  const provider = getMapProvider();
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const bySlug = useMemo(() => new Map(homes.map(h => [h.slug, h])), [homes]);
  const clusters = useMemo(() => clusterPoints(homes.map(h => ({ id: h.slug, lat: h.lat, lng: h.lng, label: short(h) }))), [homes]);
  const preview = bySlug.get(hovered ?? selected ?? "");
  return <div className={`demo-map ${layer}`} role="region" aria-label="Demo map of listed homes">
    <svg className="map-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 62 C 20 55, 35 70, 55 60 S 85 45, 100 52" /><path d="M8 0 C 18 30, 12 60, 28 100" /><path d="M70 0 C 62 35, 78 65, 66 100" /><path d="M0 28 L 100 34" className="minor"/><path d="M0 82 L 100 76" className="minor"/><path d="M42 0 L 46 100" className="minor"/>
    </svg>
    <div className="map-badge"><Info size={13}/>{provider.name} · approximate positions · not a live map</div>
    {layer === "satellite" && <div className="map-satellite-note"><Satellite size={20}/><strong>Satellite view needs a map provider</strong><span>It will appear here once a mapping service is connected.</span></div>}
    {clusters.map(c => {
      if (c.points.length > 1) {
        const open = openCluster === c.id;
        return <div key={c.id} className="map-cluster-wrap" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
          <button type="button" className="map-cluster" aria-expanded={open} aria-label={`${c.points.length} homes in this area`} onClick={() => setOpenCluster(open ? null : c.id)}>{c.points.length}</button>
          {open && <div className="cluster-list">{c.points.map(p => <button type="button" key={p.id} className={`map-marker inline${selected === p.id ? " selected" : ""}`} onClick={() => onSelect(p.id)} onMouseEnter={() => onHover(p.id)} onMouseLeave={() => onHover(null)}>{p.label}</button>)}</div>}
        </div>;
      }
      const p = c.points[0]!;
      return <button type="button" key={p.id} className={`map-marker${selected === p.id ? " selected" : ""}${hovered === p.id ? " hovered" : ""}`} style={{ left: `${c.x}%`, top: `${c.y}%` }}
        aria-label={`${bySlug.get(p.id)?.name}, ${p.label}`} aria-pressed={selected === p.id} onClick={() => onSelect(p.id)} onMouseEnter={() => onHover(p.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(p.id)} onBlur={() => onHover(null)}>{p.label}</button>;
    })}
    {!homes.length && <div className="map-empty">No homes to place on the map. Try clearing a filter.</div>}
    {preview && <Link to="/property/$slug" params={{ slug: preview.slug }} className="map-preview"><img src={preview.image} alt="" width={96} height={76}/><span><small>{preview.neighborhood}, {preview.city}</small><strong>{preview.name}</strong><em>{displayPrice(preview)}{preview.mode === "Rent" ? " / month" : ""} · {preview.beds} BHK</em></span></Link>}
  </div>;
}
