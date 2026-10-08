import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, TileSkeletons } from "@/components/empty-state";
import { HomeTile } from "@/components/home-tile";
import { criteriaFrom, rankMatches, type RankedMatch } from "@/lib/match";
import { getListing } from "@/lib/catalog";
import { useLiveListings } from "@/lib/use-live-listings";
import { useUserData } from "@/lib/user-data";

export function SmartMatches() {
  const { data } = useUserData();
  const live = useLiveListings();

  if (!live.data) return <TileSkeletons count={3}/>;

  const requirements = data.searches.length
    ? data.searches.map(search => ({ id: search.id, label: search.label, criteria: search.filters }))
    : [{ id: "preferences", label: "Your preferences", criteria: criteriaFrom(data.preferences) }];

  const bySlug = new Map<string, RankedMatch & { requirement: string }>();
  for (const requirement of requirements) {
    for (const result of rankMatches(live.data, requirement.criteria)) {
      const existing = bySlug.get(result.listing.slug);
      if (!existing || result.match.score > existing.match.score) {
        bySlug.set(result.listing.slug, { ...result, requirement: requirement.label });
      }
    }
  }

  const matches = [...bySlug.values()].slice(0, 8);

  return <div className="smart-matches">
    <div className="results-line">
      <div>
        <p className="kicker">SMART MATCHING</p>
        <h3>{matches.length ? "Homes picked for you" : "Set a few requirements"}</h3>
        <p className="form-hint">Ranked from your saved requirements and listing details only.</p>
      </div>
      <Button asChild variant="outline" size="sm"><Link to="/dashboard" search={{ tab: "searches" }}>Manage requirements</Link></Button>
    </div>

    {matches.length ? <div className="home-grid dash-grid">
      {matches.map(({ listing, match, requirement }) => {
        const home = live.data?.find(item => item.slug === listing.slug) ?? getListing(listing.slug);
        return <HomeTile key={listing.slug} home={home} listing={listing} match={match}/>;
      })}
    </div> : <EmptyState icon={<Sparkles size={30}/>} title="No strong matches yet" action={<Button asChild><Link to="/properties">Build a requirement</Link></Button>}>
      Save a search with at least two criteria such as location, BHK or budget and matching homes will appear here.
    </EmptyState>}
  </div>;
}
