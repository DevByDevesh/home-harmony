import { Pencil, X } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cities } from "@/lib/catalog";
import { removeChip, type Chip, type Filters } from "@/lib/filters";

const selects: Partial<Record<Chip["key"], [string, string][]>> = {
  beds: [["1", "1 BHK"], ["2", "2 BHK"], ["3", "3 BHK"], ["4", "4+ BHK"]],
  baths: [["1", "1+"], ["2", "2+"], ["3", "3+"]],
  furnishing: [["Fully furnished", "Fully furnished"], ["Semi furnished", "Semi furnished"], ["Unfurnished", "Unfurnished"]],
  kind: ["Apartment", "House", "Room", "PG", "Commercial"].map(k => [k, k]),
  mode: [["Rent", "Rent"], ["Buy", "Buy"]],
  city: cities.map(c => [c, c]),
};
const numeric = new Set<Chip["key"]>(["min", "max", "minArea"]);
const text = new Set<Chip["key"]>(["location"]);

/** A filter chip that can be edited in place (value-type chips) or removed. Works for manual and Smart Search filters alike. */
export function EditableChip({ chip, filters, onChange }: { chip: Chip; filters: Filters; onChange: (f: Filters) => void }) {
  const editable = !!selects[chip.key] || numeric.has(chip.key) || text.has(chip.key);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(filters[chip.key] ?? "");
  const remove = <button type="button" className="chip-x" onClick={() => onChange(removeChip(filters, chip))} aria-label={`Remove ${chip.label}`}><X size={13}/></button>;
  if (!editable) return <span className="filter-chip editable">{chip.label}{remove}</span>;
  const opts = selects[chip.key];
  const save = () => { const v = String(value).trim(); onChange({ ...filters, [chip.key]: v || undefined }); setOpen(false); };
  return <span className="filter-chip editable">
    <Popover open={open} onOpenChange={o => { setOpen(o); if (o) setValue(filters[chip.key] ?? ""); }}>
      <PopoverTrigger className="chip-edit" aria-label={`Edit ${chip.label}`}>{chip.label}<Pencil size={11} aria-hidden/></PopoverTrigger>
      <PopoverContent className="chip-pop" align="start">
        <form onSubmit={e => { e.preventDefault(); save(); }}>
          <label className="field"><span>Edit {chip.key === "max" ? "maximum budget (₹)" : chip.key === "min" ? "minimum budget (₹)" : chip.key === "minArea" ? "minimum area (sq.ft.)" : chip.key}</span>
            {opts ? <select className="filter-select" value={value} onChange={e => setValue(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : <input className="filter-select" autoFocus inputMode={numeric.has(chip.key) ? "numeric" : "text"} value={value} maxLength={60} onChange={e => setValue(numeric.has(chip.key) ? e.target.value.replace(/\D/g, "") : e.target.value)}/>}
          </label>
          <div className="chip-pop-actions"><Button type="submit" size="sm">Update</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </form>
      </PopoverContent>
    </Popover>{remove}
  </span>;
}
