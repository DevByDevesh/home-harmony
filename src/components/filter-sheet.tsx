import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { amenityOptions, cities, listings } from "@/lib/catalog";
import { amenityList, applyFilters, clearFilters, type Filters } from "@/lib/filters";

function Group({ label, children }: { label: string; children: ReactNode }) { return <fieldset className="filter-group"><legend>{label}</legend>{children}</fieldset>; }
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
        <Group label={rent ? "Monthly rent" : "Price"}><div className="range-row">
          <select className="filter-select" value={draft.min ?? ""} onChange={e => set({ min: e.target.value || undefined })} aria-label="Minimum price"><option value="">No min</option>{(rent ? [20000, 40000, 60000, 100000] : [10000000, 20000000, 30000000]).map(v => <option key={v} value={v}>₹{v.toLocaleString("en-IN")}</option>)}</select>
          <span>to</span>
          <select className="filter-select" value={draft.max ?? ""} onChange={e => set({ max: e.target.value || undefined })} aria-label="Maximum price"><option value="">No max</option>{(rent ? [30000, 60000, 100000, 150000] : [20000000, 30000000, 40000000]).map(v => <option key={v} value={v}>₹{v.toLocaleString("en-IN")}</option>)}</select>
        </div></Group>
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
