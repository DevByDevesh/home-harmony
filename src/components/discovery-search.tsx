import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { HomeQuery } from "@/lib/catalog";

export function DiscoverySearch({ initial = {} }: { initial?: HomeQuery }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initial.mode || "Rent");
  const [location, setLocation] = useState(initial.location || "");
  const [kind, setKind] = useState(initial.kind || "");
  const [max, setMax] = useState(initial.max || "");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({ to: "/properties", search: { mode, location: location.trim() || undefined, kind: kind || undefined, max: max || undefined } });
  }
  return <form className="discovery-search" onSubmit={submit}>
    <div className="search-top"><span>START YOUR SEARCH</span><div className="mode-toggle" role="group" aria-label="Looking to"><Button type="button" variant="ghost" aria-pressed={mode === "Rent"} onClick={() => { setMode("Rent"); setMax(""); }}>Rent</Button><Button type="button" variant="ghost" aria-pressed={mode === "Buy"} onClick={() => { setMode("Buy"); setMax(""); }}>Buy</Button></div></div>
    <div className="search-row">
      <label className="search-cell search-place"><span>LOCATION</span><div><MapPin size={18} aria-hidden="true"/><input value={location} onChange={event => setLocation(event.target.value)} placeholder="City or neighbourhood" aria-label="City or neighbourhood" /></div></label>
      <label className="search-cell"><span>PROPERTY TYPE</span><select value={kind} onChange={event => setKind(event.target.value)} aria-label="Property type"><option value="">Any type</option><option>Apartment</option><option>House</option><option>Room</option><option>PG</option><option>Commercial</option></select></label>
      <label className="search-cell"><span>MAX BUDGET</span><select value={max} onChange={event => setMax(event.target.value)} aria-label="Maximum budget"><option value="">Any budget</option>{(mode === "Rent" ? [["30000", "₹30,000 / mo"], ["60000", "₹60,000 / mo"], ["100000", "₹1 lakh / mo"], ["150000", "₹1.5 lakh / mo"]] : [["10000000", "₹1 crore"], ["25000000", "₹2.5 crore"], ["40000000", "₹4 crore"]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button type="submit" className="search-go" aria-label="Search homes"><ArrowRight size={21}/><span>Search homes</span></Button>
    </div>
  </form>;
}
