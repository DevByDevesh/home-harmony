import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { useState, type FormEvent, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import type { HomeQuery } from "@/lib/catalog";

export function DiscoverySearch({ initial = {} }: { initial?: HomeQuery }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initial.mode || "Rent");
  const [location, setLocation] = useState(initial.location || "");
  const [kind, setKind] = useState(initial.kind || "");
  const budget = mode === "Buy" ? { min: 10000, max: 100000000, step: 500000 } : { min: 1000, max: 500000, step: 1000 };
  const [min, setMin] = useState(initial.min || "");
  const [max, setMax] = useState(initial.max || "");

  const formatBudget = (value: number) => {
    if (mode === "Buy") {
      if (value >= 10000000) {
        return `₹${(value / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
      }
      if (value >= 100000) {
        return `₹${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} Lakh`;
      }
      return `₹${value.toLocaleString("en-IN")}`;
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} Lakh`;
    }
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const currentMin = Math.min(Math.max(Number(min) || budget.min, budget.min), budget.max - budget.step);
  const currentMax = Math.max(Math.min(Number(max) || budget.max, budget.max), budget.min + budget.step);
  const minValue = Math.min(currentMin, currentMax - budget.step);
  const maxValue = Math.max(currentMax, minValue + budget.step);
  const minPercent = ((minValue - budget.min) / (budget.max - budget.min)) * 100;
  const maxPercent = ((maxValue - budget.min) / (budget.max - budget.min)) * 100;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({ to: "/properties", search: { mode, location: location.trim() || undefined, kind: kind || undefined, min: min || undefined, max: max || undefined } });
  }
  return <form className="discovery-search" onSubmit={submit}>
    <div className="search-top"><span>START YOUR SEARCH</span><div className="mode-toggle" role="group" aria-label="Looking to"><Button type="button" variant="ghost" aria-pressed={mode === "Rent"} onClick={() => { setMode("Rent"); setMin(""); setMax(""); }}>Rent</Button><Button type="button" variant="ghost" aria-pressed={mode === "Buy"} onClick={() => { setMode("Buy"); setMin(""); setMax(""); }}>Buy</Button></div></div>
    <div className="search-row">
      <label className="search-cell search-place"><span>LOCATION</span><div><MapPin size={18} aria-hidden="true"/><input value={location} onChange={event => setLocation(event.target.value)} placeholder="City or neighbourhood" aria-label="City or neighbourhood" /></div></label>
      <label className="search-cell"><span>PROPERTY TYPE</span><select value={kind} onChange={event => setKind(event.target.value)} aria-label="Property type"><option value="">Any type</option><option>Apartment</option><option>House</option><option>Room</option><option>PG</option><option>Commercial</option></select></label>
      <fieldset className="search-cell discovery-budget"><legend><span>BUDGET</span></legend>
        <div className="discovery-budget-values"><strong>{formatBudget(minValue)}</strong><span>to</span><strong>{formatBudget(maxValue)}</strong></div>
        <div className="discovery-budget-slider" style={{ "--budget-start": `${minPercent}%`, "--budget-end": `${maxPercent}%` } as CSSProperties}>
          <div className="discovery-budget-fill" aria-hidden="true" />
          <input type="range" min={budget.min} max={budget.max} step={budget.step} value={minValue} onChange={event => { const next = Math.min(Number(event.target.value), maxValue - budget.step); setMin(next === budget.min ? "" : String(next)); }} aria-label="Minimum budget" />
          <input type="range" min={budget.min} max={budget.max} step={budget.step} value={maxValue} onChange={event => { const next = Math.max(Number(event.target.value), minValue + budget.step); setMax(next === budget.max ? "" : String(next)); }} aria-label="Maximum budget" />
        </div>
        <div className="discovery-budget-limits"><span>{formatBudget(budget.min)}</span><span>{formatBudget(budget.max)}</span></div>
      </fieldset>
      <Button type="submit" className="search-go" aria-label="Search homes"><ArrowRight size={21}/><span>Search homes</span></Button>
    </div>
  </form>;
}
