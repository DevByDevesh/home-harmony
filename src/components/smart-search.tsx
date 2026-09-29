import { AlertCircle, Info, Loader2, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAIProvider } from "@/lib/ai/provider";
import { EXAMPLE_QUERIES, parseQuery, type ParsedSearch } from "@/lib/ai/nl-parser";
import { clearFilters, type Filters } from "@/lib/filters";
import { track } from "@/lib/analytics";

type Status = "idle" | "processing" | "done" | "error";

/**
 * Natural-language entry point. It never searches on its own: the provider turns text into the same
 * Filters object the manual search uses, and the parent applies it to the existing filter engine.
 */
export function SmartSearch({ filters, onApply, count }: { filters: Filters; onApply: (f: Filters) => void; count: number }) {
  const provider = getAIProvider();
  const [text, setText] = useState(filters.q ?? "");
  const [status, setStatus] = useState<Status>(filters.q ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedSearch | null>(null);
  useEffect(() => { setText(filters.q ?? ""); if (!filters.q) { setResult(null); if (status === "done") setStatus("idle"); } }, [filters.q]); // eslint-disable-line react-hooks/exhaustive-deps
  // Parsing is deterministic, so a shared link can rebuild the explanation without re-running the provider.
  const shown = useMemo(() => result ?? (filters.q ? parseQuery(filters.q) : null), [result, filters.q]);

  const run = async (query: string) => {
    const q = query.trim();
    if (q.length < 3) { setStatus("error"); setError("Tell us a little more — for example: 2BHK in Hinjewadi under ₹30,000."); return; }
    setStatus("processing"); setError(null);
    try {
      const parsed = await provider.generateSearchParameters(q.slice(0, 300));
      if (!parsed.understood.length) { setResult(parsed); setStatus("error"); setError(parsed.unsure[0] ?? "I couldn't confidently understand that search."); return; }
      setResult(parsed); setStatus("done"); track("SEARCH");
      onApply({ ...clearFilters(filters), ...parsed.filters, q });
    } catch { setStatus("error"); setError("Smart Search couldn't process that right now. Your filters are unchanged."); }
  };

  return <section className="smart-search" aria-labelledby="smart-title">
    <div className="smart-head"><h2 id="smart-title"><ScanSearch size={18} aria-hidden/> Smart Search</h2><span className="smart-tag" title={provider.label}>{provider.isDemo ? "Preview · local rules, no AI model" : "AI"}</span></div>
    <form className="smart-form" onSubmit={e => { e.preventDefault(); void run(text); }}>
      <label className="sr-only" htmlFor="smart-q">Describe the home you want</label>
      <input id="smart-q" value={text} maxLength={300} onChange={e => setText(e.target.value)} placeholder="Tell us what you’re looking for… e.g. furnished 2BHK near Hinjewadi under ₹30,000 with parking" autoComplete="off"/>
      <Button type="submit" disabled={status === "processing"}>{status === "processing" ? <><Loader2 className="spin" size={15}/> Understanding…</> : "Search"}</Button>
    </form>
    {status === "idle" && <div className="smart-examples"><span>Try:</span>{EXAMPLE_QUERIES.map(q => <button key={q} type="button" onClick={() => { setText(q); void run(q); }}>{q}</button>)}</div>}
    {status === "processing" && <p className="smart-status" role="status">Reading your request and matching it to filters…</p>}
    {status === "error" && error && <div className="smart-error" role="alert"><AlertCircle size={16}/><div><strong>{error}</strong><span>Try: “2BHK in Hinjewadi under ₹30,000”. Nothing was changed.</span></div></div>}
    {status === "done" && shown && <div className="smart-result" aria-live="polite">
      <p><strong>We understood:</strong> {shown.understood.join(" · ")}</p>
      <p className="smart-meta">{count} matching {count === 1 ? "property" : "properties"} with the criteria in use now · the chips below are the live criteria — edit, remove or add filters.</p>
      {shown.unsure.map(u => <p key={u} className="smart-warn"><AlertCircle size={14}/>{u}</p>)}
      {shown.notes.map(n => <p key={n} className="smart-note"><Info size={14}/>{n}</p>)}
      <div className="smart-actions"><button type="button" className="text-link" onClick={() => document.getElementById("smart-q")?.focus()}>Edit search</button><button type="button" className="text-link" onClick={() => { setResult(null); setStatus("idle"); setText(""); onApply(clearFilters(filters)); }}>Clear extracted criteria</button></div>
    </div>}
  </section>;
}
