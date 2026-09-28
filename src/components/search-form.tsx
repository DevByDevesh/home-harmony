import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, MapPin, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SearchFilters } from "@/lib/properties";

export function SearchForm({ initial = {}, compact = false }: { initial?: SearchFilters; compact?: boolean }) {
  const navigate = useNavigate();
  const [intent, setIntent] = useState(initial.intent || "Rent");
  const [location, setLocation] = useState(initial.location || "");
  const [type, setType] = useState(initial.type || "");
  const [budget, setBudget] = useState(initial.budget || "");
  const submit = (event: FormEvent) => { event.preventDefault(); void navigate({ to: "/properties", search: { location: location.trim() || undefined, intent, type: type || undefined, budget: budget || undefined } }); };
  return <form className={`search-panel ${compact ? "search-panel-compact" : ""}`} onSubmit={submit}>
    <div className="search-tabs" role="group" aria-label="Property intent"><Button type="button" variant="ghost" className={intent === "Rent" ? "selected" : ""} onClick={() => setIntent("Rent")}>Rent</Button><Button type="button" variant="ghost" className={intent === "Buy" ? "selected" : ""} onClick={() => setIntent("Buy")}>Buy</Button></div>
    <div className="search-fields"><label className="search-field search-location"><span>WHERE</span><div><MapPin size={19}/><Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or locality" aria-label="City or locality" /></div></label>
      <label className="search-field"><span>PROPERTY TYPE</span><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Property type"><option value="">Any property</option><option>Apartment</option><option>House</option><option>Room</option><option>PG</option><option>Commercial</option></select></label>
      <label className="search-field"><span>MAX BUDGET</span><div className="budget-field"><SlidersHorizontal size={17}/><select value={budget} onChange={(event) => setBudget(event.target.value)} aria-label="Maximum budget"><option value="">Any budget</option>{(intent === "Rent" ? [["25000", "₹25,000"], ["50000", "₹50,000"], ["100000", "₹1 lakh"], ["200000", "₹2 lakh"]] : [["5000000", "₹50 lakh"], ["10000000", "₹1 crore"], ["30000000", "₹3 crore"]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></label>
      <Button type="submit" className="search-submit">Search homes <ArrowRight size={19}/></Button></div>
  </form>;
}