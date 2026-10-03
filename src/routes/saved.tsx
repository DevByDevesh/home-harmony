import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, TileSkeletons } from "@/components/empty-state";
import { HomeTile } from "@/components/home-tile";
import { getListing } from "@/lib/catalog";
import { useLiveListings } from "@/lib/use-live-listings";
import { useUserData } from "@/lib/user-data";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [
    { title: "Saved properties — HouseProvider.in" },
    { name: "description", content: "Homes you saved on this device, ready to revisit and compare." },
    { property: "og:title", content: "Saved properties — HouseProvider.in" },
    { property: "og:description", content: "Keep track of the homes you love." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: SavedPage,
});
function SavedPage() {
  const { data, ready } = useUserData();
  const live = useLiveListings();
  const saved = data.saved.map(s => live.data?.find(l => l.slug === s) ?? getListing(s)).filter(x => !!x);
  return <main className="results-page"><div className="wrap">
    <div className="results-intro"><p className="kicker">YOUR SHORTLIST</p><h1>Saved <em>places.</em></h1><p>Saved on this device. Signing in to keep them everywhere arrives in a later phase.</p></div>
    <div className="results-line"><div><p className="kicker">SAVED</p><h2>{ready ? `${saved.length} ${saved.length === 1 ? "property" : "properties"}` : "Loading…"}</h2></div>{saved.length > 1 && <Button asChild variant="outline" size="sm"><Link to="/compare">Compare saved</Link></Button>}</div>
    {!ready ? <TileSkeletons/> : saved.length ? <div className="home-grid results-grid">{saved.map(h => <HomeTile key={h.slug} home={h} listing={h}/>)}</div>
      : <EmptyState icon={<Heart size={34}/>} title="No saved properties yet" action={<Button asChild><Link to="/properties">Explore homes</Link></Button>}>Save properties you like and compare them later.</EmptyState>}
  </div></main>;
}
