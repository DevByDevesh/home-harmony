import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import { availabilityLabel, displayPrice, getListing, type Home } from "@/lib/catalog";
import type { MatchResult } from "@/lib/match";
import { CompareButton, SaveButton } from "./listing-actions";
import { MatchBadge } from "./match-badge";

type Props = { home: Home; match?: MatchResult | null; compact?: boolean; highlighted?: boolean; onHover?: (slug: string | null) => void; onSelect?: (slug: string) => void };
export function HomeTile({ home, match, compact, highlighted, onHover, onSelect }: Props) {
  const listing = getListing(home.slug);
  return <article id={`tile-${home.slug}`} className={`home-tile${compact ? " compact" : ""}${highlighted ? " highlighted" : ""}`} onClick={() => onSelect?.(home.slug)} onMouseEnter={() => onHover?.(home.slug)} onMouseLeave={() => onHover?.(null)}>
    <div className="tile-media">
      <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-image" aria-label={`View ${home.name}`}><img src={home.image} alt={`Illustrative view of ${home.name}`} width={1008} height={768} loading="lazy"/><span className="tile-tag">{home.mode === "Rent" ? "FOR RENT" : "FOR SALE"}</span><span className="tile-arrow"><ArrowUpRight size={20}/></span></Link>
      {listing && <div className="tile-actions"><SaveButton home={listing}/><CompareButton home={listing}/></div>}
    </div>
    <div className="tile-info"><span className="tile-place"><MapPin size={14}/>{home.neighborhood}, {home.city}</span><span className="tile-price">{displayPrice(home)}{home.mode === "Rent" && <small> / month</small>}</span></div>
    <Link to="/property/$slug" params={{ slug: home.slug }} className="tile-name">{home.name}</Link>
    <div className="tile-specs"><span>{home.beds} BHK</span><span>{home.area.toLocaleString("en-IN")} sq.ft.</span><span>{home.furnishing}</span></div>
    {listing && <div className="tile-meta"><span>{availabilityLabel(listing)}</span><span className="tile-unverified">Not verified</span>{match && <MatchBadge match={match}/>}</div>}
  </article>;
}
