import { Link } from "@tanstack/react-router";
import { BellOff, BellRing, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EditableChip } from "@/components/editable-chip";
import { activeChips } from "@/lib/filters";
import { alertTypes, defaultAlerts, frequencies, matchingSlugs, newSinceSaved, type AlertFrequency, type AlertType } from "@/lib/alerts";
import { userActions, type SavedSearch } from "@/lib/user-data";

export function SavedSearchCard({ search }: { search: SavedSearch }) {
  const alerts = search.alerts ?? defaultAlerts();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(search.label);
  const chips = activeChips(search.filters);
  const now = matchingSlugs(search.filters).length;
  const fresh = newSinceSaved(search.filters, search.seen);
  const setAlerts = (patch: Partial<typeof alerts>) => userActions.updateSearch(search.id, { alerts: { ...alerts, ...patch } });
  const toggleType = (t: AlertType) => setAlerts({ types: alerts.types.includes(t) ? alerts.types.filter(x => x !== t) : [...alerts.types, t] });

  return <li className="search-card">
    <div className="search-card-head">
      {editing ? <form className="search-rename" onSubmit={e => { e.preventDefault(); userActions.updateSearch(search.id, { label: label.trim() || search.label }); setEditing(false); }}><input aria-label="Search name" value={label} maxLength={80} autoFocus onChange={e => setLabel(e.target.value)}/><Button size="sm" type="submit">Save</Button></form>
        : <div><strong>{search.label}</strong><small>{now} {now === 1 ? "home matches" : "homes match"} now{fresh.length ? ` · ${fresh.length} new since saved` : ""}</small></div>}
      <div className="dash-row-actions">
        <Button asChild size="sm" variant="outline"><Link to="/properties" search={search.filters} onClick={() => userActions.markSearchSeen(search.id)}>Open</Link></Button>
        <Button size="sm" variant="ghost" aria-label="Rename search" onClick={() => setEditing(e => !e)}><Pencil size={14}/></Button>
        <Button size="sm" variant="ghost" aria-label="Delete saved search" onClick={() => { userActions.removeSearch(search.id); toast("Saved search deleted"); }}><Trash2 size={14}/></Button>
      </div>
    </div>
    <div className="chip-row compact" aria-label="Search criteria">{chips.length ? chips.map(c => <EditableChip key={c.key + (c.value ?? "") + (search.filters[c.key] ?? "")} chip={c} filters={search.filters} onChange={f => userActions.updateSearch(search.id, { filters: f })}/>) : <span className="form-hint">No criteria left — this search shows every home.</span>}</div>
    <fieldset className="alert-box">
      <legend className="sr-only">Alert settings</legend>
      <label className="alert-toggle"><input type="checkbox" checked={alerts.enabled} onChange={e => setAlerts({ enabled: e.target.checked })}/>{alerts.enabled ? <BellRing size={15}/> : <BellOff size={15}/>}<span>{alerts.enabled ? "Alerts on" : "Alerts off"}</span></label>
      {alerts.enabled && <>
        <select className="sort-select small" aria-label="Alert frequency" value={alerts.frequency} onChange={e => setAlerts({ frequency: e.target.value as AlertFrequency })}>{frequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
        <div className="pill-row" role="group" aria-label="Alert types">{alertTypes.map(t => <button key={t.type} type="button" className="pill" title={t.how} aria-pressed={alerts.types.includes(t.type)} onClick={() => toggleType(t.type)}>{t.label}</button>)}</div>
      </>}
      <p className="form-hint">Alerts are currently stored on this device. No email, push or WhatsApp notifications are sent yet — “new since saved” is checked only when you open this page.</p>
    </fieldset>
  </li>;
}
