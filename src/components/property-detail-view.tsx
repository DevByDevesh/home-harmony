import type { ReactNode } from "react";
import { Bath, BedDouble, Check, MapPin, Maximize2 } from "lucide-react";
import { displayPrice, type Home } from "@/lib/catalog";

/** Shared property presentation used by the public detail page and the owner listing preview. */
export function PropertyDetailView({ home, actions, aside, imageNote, disclaimer }: { home: Home; actions?: ReactNode; aside: ReactNode; imageNote: string; disclaimer: string }) {
  return <>
    <div className="detail-heading"><div><p className="kicker">{home.mode === "Rent" ? "FOR RENT" : "FOR SALE"} / {home.kind.toUpperCase()}</p><h1>{home.name}<span className="peach-stop">.</span></h1><p><MapPin size={16}/>{home.neighborhood}, {home.city}</p></div>
      <div className="detail-price">{actions && <div className="detail-actions">{actions}</div>}<strong>{displayPrice(home)}</strong><span>{home.mode === "Rent" ? "per month" : "illustrative asking price"}</span></div></div>
    <div className="detail-image"><img src={home.image} alt={`Illustrative view of ${home.name}`} width={1008} height={768}/><span>{imageNote}</span></div>
    <div className="detail-layout"><div>
      <div className="fact-row"><span><BedDouble size={22}/><strong>{home.beds}</strong> Bedrooms</span><span><Bath size={22}/><strong>{home.baths}</strong> Bathrooms</span><span><Maximize2 size={22}/><strong>{home.area.toLocaleString("en-IN")}</strong> sq.ft.</span></div>
      <section className="detail-block"><p className="kicker">THE SPACE</p><h2>A closer look.</h2><p>{home.description}</p><p className="disclaimer">{disclaimer}</p></section>
      <section className="detail-block"><p className="kicker">WHAT’S INCLUDED</p><h2>The everyday details.</h2><div className="features-grid">{[home.furnishing, ...home.features].map(feature => <span key={feature}><Check size={17}/>{feature}</span>)}</div></section>
    </div><aside className="detail-aside">{aside}</aside></div>
  </>;
}
