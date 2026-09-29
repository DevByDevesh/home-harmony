import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import { displayPrice, type Home } from "@/lib/catalog";

export function HomeTile({ home }: { home: Home }) {
  return <article className="home-tile">
    <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-image" aria-label={`View ${home.name}`}><img src={home.image} alt={`Illustrative view of ${home.name}`} width={1008} height={768} loading="lazy"/><span className="tile-tag">{home.mode === "Rent" ? "FOR RENT" : "FOR SALE"}</span><span className="tile-arrow"><ArrowUpRight size={20}/></span></Link>
    <div className="tile-info"><span className="tile-place"><MapPin size={14}/>{home.neighborhood}, {home.city}</span><span className="tile-price">{displayPrice(home)}{home.mode === "Rent" && <small> / month</small>}</span></div>
    <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-name">{home.name}</Link>
    <div className="tile-specs"><span>{home.beds} BHK</span><span>{home.area.toLocaleString("en-IN")} sq.ft.</span><span>{home.furnishing}</span></div>
  </article>;
}
