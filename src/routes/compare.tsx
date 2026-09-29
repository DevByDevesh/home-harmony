import { createFileRoute, Link } from "@tanstack/react-router";
import { GitCompareArrows, X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { availabilityLabel, displayPrice, getListing, inr, isVerified, type Listing } from "@/lib/catalog";
import { COMPARE_LIMIT, neutralDifferences } from "@/lib/compare";
import { computeMatch, criteriaFrom } from "@/lib/match";
import { userActions, useUserData } from "@/lib/user-data";
import { commuteLabel } from "@/lib/commute";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [
    { title: "Compare properties side by side — HouseProvider.in" },
    { name: "description", content: "Compare up to four homes on rent, deposit, area, amenities and more — neutral facts, no rankings." },
    { property: "og:title", content: "Compare properties side by side — HouseProvider.in" },
    { property: "og:description", content: "Neutral, factual comparison. You decide." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: ComparePage,
});
type Row = [string, (l: Listing) => ReactNode];
function ComparePage() {
  const { data, ready } = useUserData();
  const items = data.compare.map(getListing).filter(x => !!x);
  useEffect(() => { document.getElementById("compare-top")?.focus(); }, []);
  const p = data.preferences;
  const criteria = criteriaFrom(p);
  const rows: Row[] = [
    ["Rent / price", l => <>{displayPrice(l)}{l.mode === "Rent" && <small> / month</small>}</>],
    ["Deposit", l => l.deposit ? inr(l.deposit) : "Not applicable"], ["Area", l => `${l.area.toLocaleString("en-IN")} sq.ft.`],
    ["BHK", l => `${l.beds} BHK`], ["Furnishing", l => l.furnishing], ["Parking", l => l.parking ? `${l.parking} listed` : "None listed"],
    ["Bathrooms", l => l.baths], ["Availability", l => availabilityLabel(l)], ["Brokerage", l => l.brokerage], ["Commute", () => commuteLabel(null)],
    ["Amenities", l => l.features.join(", ")], ["Verification", l => isVerified(l) ? "Verified" : "Not verified"],
    ["Match score", l => { const m = computeMatch(l, criteria); return m ? <span className="compare-match">{m.score}%<small>{m.matched.length} met{m.warnings.length ? ` · ${m.warnings.length} close` : ""}{m.unmatched.length ? ` · ${m.unmatched.length} not met` : ""}</small></span> : "Add 2+ preferences to see"; }],
  ];
  return <main className="results-page"><div className="wrap">
    <div className="results-intro" id="compare-top" tabIndex={-1}><p className="kicker">SIDE BY SIDE</p><h1>Compare <em>calmly.</em></h1><p>Up to {COMPARE_LIMIT} properties. Facts only — no rankings. You decide what suits you.</p></div>
    {!ready ? <div className="tile-skeleton wide" aria-busy="true"><span/><span/></div> : items.length === 0 ? <EmptyState icon={<GitCompareArrows size={34}/>} title="No properties to compare" action={<Button asChild><Link to="/properties">Explore homes</Link></Button>}>Use the compare button on any property to add it here.</EmptyState> : <>
      {items.length > 1 ? <section className="compare-notes" aria-label="Differences"><p className="kicker">NEUTRAL DIFFERENCES</p><ul>{neutralDifferences(items).map(n => <li key={n}>{n}</li>)}</ul></section> : <p className="compare-hint">Add at least one more property to see differences.</p>}
      <div className="compare-scroll"><table className="compare-table">
        <thead><tr><th scope="col"><span className="sr-only">Detail</span><button type="button" className="chip-clear" onClick={() => userActions.clearCompare()}>Clear all</button></th>{items.map(i => <th scope="col" key={i.slug}><div className="compare-head"><img src={i.image} alt="" width={200} height={150}/><button type="button" aria-label={`Remove ${i.name}`} onClick={() => userActions.toggleCompare(i.slug)}><X size={14}/></button></div><Link to="/property/$slug" params={{ slug: i.slug }}>{i.name}</Link><small>{i.neighborhood}, {i.city}</small></th>)}</tr></thead>
        <tbody>{rows.map(([label, fn]) => <tr key={label}><th scope="row">{label}</th>{items.map(i => <td key={i.slug}>{fn(i)}</td>)}</tr>)}</tbody>
      </table></div>
      <p className="disclaimer">All values are fictional showcase data and illustrative only.</p>
    </>}
  </div></main>;
}
