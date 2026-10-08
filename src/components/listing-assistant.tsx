import { Check, Loader2, PenLine, RotateCcw, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAIProvider } from "@/lib/ai/provider";
import { contentLabels, hasEnoughFacts, missingFacts, type ListingContent, type ListingContentKey, type ListingFacts } from "@/lib/ai/listing-assistant";
import type { ListingDraft } from "@/lib/owner-data";

const order: ListingContentKey[] = ["title", "description", "highlights", "amenitySummary", "seoTitle", "seoDescription", "social"];
const toFacts = (d: ListingDraft): ListingFacts => ({ kind: d.kind, mode: d.mode, city: d.city, locality: d.locality, price: d.price, deposit: d.deposit, beds: d.beds, baths: d.baths, area: d.area, furnishing: d.furnishing, parking: d.parking, amenities: d.amenities, availableFrom: d.availableFrom, notes: d.notes ?? "" });
const asText = (c: ListingContent, k: ListingContentKey) => (k === "highlights" ? c.highlights.join("\n") : c[k]);

/**
 * Owner-facing listing assistant. Raw details → draft → owner reviews/edits → accepts into the listing draft.
 * Nothing is published; all text is built only from details already entered in this wizard.
 */
export function ListingAssistant({ draft, onApply }: { draft: ListingDraft; onApply: (patch: Partial<ListingDraft>) => void }) {
  const provider = getAIProvider();
  const [variant, setVariant] = useState(0);
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState<Record<ListingContentKey, string> | null>(null);
  const [accepted, setAccepted] = useState<Set<ListingContentKey>>(new Set());
  const facts = toFacts(draft);
  const missing = missingFacts(facts);

  const generate = async (v: number) => {
    if (!hasEnoughFacts(facts)) { toast.error("Add the property type and location first."); return; }
    setBusy(true);
    try {
      const c = await provider.generateListingContent(facts, v);
      setContent(Object.fromEntries(order.map(k => [k, asText(c, k)])) as Record<ListingContentKey, string>);
      setAccepted(new Set()); setVariant(v);
    } catch { toast.error("The assistant couldn’t draft this right now. Your listing is unchanged."); }
    finally { setBusy(false); }
  };
  const extras = (c: Record<ListingContentKey, string>) => ({ highlights: c.highlights.split("\n").map(s => s.trim()).filter(Boolean), amenitySummary: c.amenitySummary, seoTitle: c.seoTitle, seoDescription: c.seoDescription, social: c.social });
  const accept = (keys: ListingContentKey[]) => {
    if (!content) return;
    const patch: Partial<ListingDraft> = {};
    if (keys.includes("title")) patch.title = content.title.slice(0, 60);
    if (keys.includes("description")) patch.description = content.description.slice(0, 1200);
    if (keys.some(k => k !== "title" && k !== "description")) {
      const prev = draft.aiExtras ?? { highlights: [], amenitySummary: "", seoTitle: "", seoDescription: "", social: "" };
      const next = extras(content);
      patch.aiExtras = { highlights: keys.includes("highlights") ? next.highlights : prev.highlights, amenitySummary: keys.includes("amenitySummary") ? next.amenitySummary : prev.amenitySummary, seoTitle: keys.includes("seoTitle") ? next.seoTitle : prev.seoTitle, seoDescription: keys.includes("seoDescription") ? next.seoDescription : prev.seoDescription, social: keys.includes("social") ? next.social : prev.social };
    }
    onApply(patch); setAccepted(a => new Set([...a, ...keys]));
    toast.success(keys.length > 1 ? "Saved to your listing draft" : `${contentLabels[keys[0]!]} saved to draft`);
  };

  return <section className="assistant" aria-labelledby="assistant-title">
    <div className="assistant-head"><div><h3 id="assistant-title"><PenLine size={17} aria-hidden/> Listing assistant</h3><p>Drafts wording from the details you’ve entered. It never adds facts — review and edit everything before saving.</p></div><span className="smart-tag">{provider.isDemo ? "Preview · local templates, no AI model" : "AI"}</span></div>
    <label className="field wide"><span>Extra points to include (your own words, optional)</span><textarea rows={2} maxLength={300} value={draft.notes ?? ""} placeholder="e.g. Near IT Park, east-facing, gated society" onChange={e => onApply({ notes: e.target.value })}/></label>
    {missing.length > 0 && <p className="assistant-missing"><strong>Not provided yet:</strong> {missing.join(", ")}. The draft will leave these out rather than guess.</p>}
    <div className="assistant-actions">
      <Button type="button" onClick={() => void generate(content ? variant + 1 : 0)} disabled={busy}>{busy ? <><Loader2 className="spin" size={15}/> Drafting…</> : content ? <><RefreshCw size={15}/> Regenerate</> : "Generate draft"}</Button>
      {content && <><Button type="button" variant="outline" onClick={() => accept(order)}><Check size={15}/> Accept all</Button><Button type="button" variant="ghost" onClick={() => { setContent(null); setAccepted(new Set()); }}><RotateCcw size={15}/> Reset</Button></>}
    </div>
    {content && <div className="assistant-fields">
      {order.map(k => <div key={k} className="assistant-field">
        <div className="assistant-field-head"><label htmlFor={`ai-${k}`}>{contentLabels[k]}{k === "highlights" && <small> · one per line</small>}</label>{accepted.has(k) ? <span className="assistant-ok"><Check size={13}/> In draft</span> : <button type="button" className="text-link" onClick={() => accept([k])}>Accept</button>}</div>
        <textarea id={`ai-${k}`} rows={k === "description" ? 5 : k === "title" || k === "seoTitle" ? 1 : 3} value={content[k]} onChange={e => { setContent({ ...content, [k]: e.target.value }); setAccepted(a => { const n = new Set(a); n.delete(k); return n; }); }}/>
      </div>)}
      <p className="form-hint">Accepted text goes into your draft only. Title and description appear in the preview step; SEO and social text are kept with the draft for later. Nothing is published automatically.</p>
    </div>}
  </section>;
}
