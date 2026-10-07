import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { amenityOptions, cities, listings } from "@/lib/catalog";
import { amenityList, applyFilters, clearFilters, type Filters } from "@/lib/filters";

function Group({ label, children }: { label: string; children: ReactNode }) { return <fieldset className="filter-group"><legend>{label}</legend>{children}</fieldset>; }

const RENT_BUDGET = { min: 5000, max: 500000, step: 1000 } as const;
const BUY_BUDGET = { min: 1000000, max: 200000000, step: 500000 } as const;

function formatBudget(value: number, mode: string | undefined) {
  if (mode === "Buy") {
    if (value >= 10000000) return `₹${(value / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
    return `₹${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} Lakh`;
  }
  if (value >= 100000) return `₹${(value / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} Lakh`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function BudgetRange({ draft, onChange }: { draft: Filters; onChange: (patch: Partial<Filters>) => void }) {
  const config = draft.mode === "Buy" ? BUY_BUDGET : RENT_BUDGET;
  const currentMin = Math.min(Math.max(Number(draft.min) || config.min, config.min), config.max - config.step);
  const currentMax = Math.max(Math.min(Number(draft.max) || config.max, config.max), config.min + config.step);
  const minValue = Math.min(currentMin, currentMax - config.step);
  const maxValue = Math.max(currentMax, minValue + config.step);
  const minPercent = ((minValue - config.min) / (config.max - config.min)) * 100;
  const maxPercent = ((maxValue - config.min) / (config.max - config.min)) * 100;

  const updateMin = (value: number) => {
    const next = Math.min(value, maxValue - config.step);
    onChange({ min: next === config.min ? undefined : String(next) });
  };
  const updateMax = (value: number) => {
    const next = Math.max(value, minValue + config.step);
    onChange({ max: next === config.max ? undefined : String(next) });
  };

  return <Group label="Budget">
    <div className="budget-range">
      <div className="budget-range-values">
        <strong>{formatBudget(minValue, draft.mode)}</strong>
        <span>{draft.mode === "Rent" ? "per month" : "purchase price"}</span>
        <strong>{formatBudget(maxValue, draft.mode)}</strong>
      </div>
      <div className="budget-range-slider" style={{ "--budget-start": `${minPercent}%`, "--budget-end": `${maxPercent}%` } as CSSProperties}>
        <div className="budget-range-fill" aria-hidden="true" />
        <input type="range" min={config.min} max={config.max} step={config.step} value={minValue} onChange={e => updateMin(Number(e.target.value))} aria-label="Minimum budget" />
        <input type="range" min={config.min} max={config.max} step={config.step} value={maxValue} onChange={e => updateMax(Number(e.target.value))} aria-label="Maximum budget" />
      </div>
      <div className="budget-range-limits">
        <span>{formatBudget(config.min, draft.mode)}</span>
        <span>{formatBudget(config.max, draft.mode)}</span>
      </div>
      <p className="budget-range-hint">Drag either handle to narrow the budget. {draft.mode === "Rent" ? "Rent is shown monthly." : "Buy is shown as the total property price."}</p>
    </div>
  </Group>;
}
function Pills({ value, options, onChange, label }: { value?: string | undefined; options: [string, string][]; onChange: (v: string | undefined) => void; label: string }) {
  return <div className="pill-row" role="group" aria-label={label}>{options.map(([v, text]) => <button type="button" key={v} className="pill" aria-pressed={value === v} onClick={() => onChange(value === v ? undefined : v)}>{text}</button>)}</div>;
}

export function FilterSheet({ filters, onApply, activeCount }: { filters: Filters; onApply: (f: Filters) => void; activeCount: number }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);
  const mobile = useIsMobile();
  useEffect(() => { if (open) setDraft(filters); }, [open, filters]);
  const set = (patch: Partial<Filters>) => setDraft(d => ({ ...d, ...patch }));
  const count = applyFilters(listings, draft).length;
  const amenities = amenityList(draft);
  const rent = draft.mode !== "Buy";
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild><Button variant="outline" className="filter-trigger"><SlidersHorizontal size={16}/>Filters{activeCount > 0 && <span className="filter-count">{activeCount}</span>}</Button></SheetTrigger>
    <SheetContent side={mobile ? "bottom" : "right"} className="filter-sheet">
      <SheetHeader><SheetTitle>Filters</SheetTitle><SheetDescription>Narrow the collection to what matters to you.</SheetDescription></SheetHeader>
      <div className="filter-body">
        <Group label="Looking to"><Pills label="Looking to" value={draft.mode} options={[["Rent", "Rent"], ["Buy", "Buy"]]} onChange={v => set({ mode: v, min: undefined, max: undefined })}/></Group>
        <Group label="City"><select className="filter-select" value={draft.city ?? ""} onChange={e => set({ city: e.target.value || undefined })} aria-label="City"><option value="">Any city</option>{cities.map(c => <option key={c}>{c}</option>)}</select></Group>
        <Group label="Locality"><input className="filter-select" value={draft.location ?? ""} onChange={e => set({ location: e.target.value || undefined })} placeholder="e.g. Hinjewadi" aria-label="Locality"/></Group>
        <Group label="Property type"><Pills label="Property type" value={draft.kind} options={["Apartment", "House", "Room", "PG", "Commercial"].map(k => [k, k])} onChange={v => set({ kind: v })}/></Group>
        <Group label="BHK"><Pills label="BHK" value={draft.beds} options={[["1", "1 BHK"], ["2", "2 BHK"], ["3", "3 BHK"], ["4", "4+ BHK"]]} onChange={v => set({ beds: v })}/></Group>
        <BudgetRange draft={draft} onChange={patch => set(patch)} />
        <Group label="Minimum area"><Pills label="Minimum area" value={draft.minArea} options={[["800", "800+"], ["1200", "1,200+"], ["1600", "1,600+"], ["2500", "2,500+"]]} onChange={v => set({ minArea: v })}/></Group>
        <Group label="Furnishing"><Pills label="Furnishing" value={draft.furnishing} options={["Fully furnished", "Semi furnished", "Unfurnished"].map(k => [k, k])} onChange={v => set({ furnishing: v })}/></Group>
        <Group label="Bathrooms"><Pills label="Bathrooms" value={draft.baths} options={[["1", "1+"], ["2", "2+"], ["3", "3+"]]} onChange={v => set({ baths: v })}/></Group>
        <Group label="Amenities"><div className="pill-row">{amenityOptions.map(a => <button type="button" key={a} className="pill" aria-pressed={amenities.includes(a)} onClick={() => { const next = amenities.includes(a) ? amenities.filter(x => x !== a) : [...amenities, a]; set({ amenities: next.length ? next.join(",") : undefined }); }}>{a}</button>)}</div></Group>
        <Group label="More"><div className="toggle-list">
          <label><input type="checkbox" checked={!!draft.parking} onChange={e => set({ parking: e.target.checked ? "1" : undefined })}/>Parking listed</label>
          <label><input type="checkbox" checked={!!draft.available} onChange={e => set({ available: e.target.checked ? "1" : undefined })}/>Listed as available now</label>
          <label><input type="checkbox" checked={!!draft.verified} onChange={e => set({ verified: e.target.checked ? "1" : undefined })}/>Verified listings only <small>No showcase home is verified yet</small></label>
        </div></Group>
        <Group label="Match score"><Pills label="Match score" value={draft.match} options={[["50", "50%+"], ["75", "75%+"], ["100", "100%"]]} onChange={v => set({ match: v })}/><p className="filter-hint">Scores use the criteria you choose above. Pick at least two to see them.</p></Group>
      </div>
      <div className="filter-foot"><Button variant="ghost" onClick={() => setDraft(clearFilters(draft))}>Clear all</Button><Button onClick={() => { onApply(draft); setOpen(false); }}>{count ? `Show ${count} ${count === 1 ? "home" : "homes"}` : "Apply filters"}</Button></div>
    </SheetContent>
  </Sheet>;
}
