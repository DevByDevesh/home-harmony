import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";
import { getListing } from "@/lib/catalog";
import { COMPARE_LIMIT } from "@/lib/compare";
import { useLiveListings } from "@/lib/use-live-listings";
import { userActions, useUserData } from "@/lib/user-data";

export function CompareTray() {
  const { data } = useUserData();
  const live = useLiveListings();
  const path = useRouterState({ select: s => s.location.pathname });
  if (!data.compare.length || path === "/compare") return null;
  const items = data.compare.map(s => live.data?.find(l => l.slug === s) ?? getListing(s)).filter(x => !!x);
  return <aside className="compare-tray" aria-label="Comparison">
    <div className="compare-thumbs">{items.map(i => <span key={i.slug} className="compare-thumb"><img src={i.image} alt="" width={48} height={48}/><button type="button" aria-label={`Remove ${i.name}`} onClick={() => userActions.toggleCompare(i.slug)}><X size={11}/></button></span>)}</div>
    <span className="compare-count">{items.length} of {COMPARE_LIMIT} to compare</span>
    <Link to="/compare" className="compare-go">Compare <ArrowRight size={15}/></Link>
  </aside>;
}
