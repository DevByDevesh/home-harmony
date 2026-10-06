import { guardArea } from "@/lib/auth/route-guard";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HomeTile } from "@/components/home-tile";
import { PropertyDetailView } from "@/components/property-detail-view";
import { ListingAssistant } from "@/components/listing-assistant";
import { ListingStatusPill } from "@/components/role-switcher";
import { amenityOptions, inr } from "@/lib/catalog";
import { timeAgo } from "@/lib/local-store";
import { demoPhotos, draftToHome, ownerActions, photoLabels, useOwnerData, validateStep, type DemoPhoto, type ListingDraft } from "@/lib/owner-data";
import { useServerFn } from "@tanstack/react-start";
import { SavedPhotoUploader, StagedPhotoUploader, uploadAll } from "@/components/photo-uploader";
import { autoReviewMyListingFn, createMyListingFn, getMyListingDraftFn, updateMyListingFn } from "@/lib/owner-listings.functions";

const steps = ["Property type", "Location", "Price", "Details", "Amenities", "Photos", "Verification", "Preview", "Publish"] as const;
const kinds = ["Apartment", "House", "Room", "PG", "Commercial"] as const;

export const Route = createFileRoute("/owner_/new")({
  beforeLoad: guardArea("owner"),
  validateSearch: z.object({ edit: z.string().optional(), dbEdit: z.string().max(64).optional() }),
  head: () => ({ meta: [
    { title: "List your property — HouseProvider.in" },
    { name: "description", content: "Create a property listing in nine guided steps, preview it exactly as seekers will see it, and submit it for review." },
    { property: "og:title", content: "List your property — HouseProvider.in" },
    { property: "og:description", content: "A guided nine-step listing flow for owners." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Wizard,
});

function Wizard() {
  const { edit, dbEdit } = Route.useSearch();
  const { data, ready } = useOwnerData();
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [autoApproved, setAutoApproved] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const createListing = useServerFn(createMyListingFn);
  const autoReviewListing = useServerFn(autoReviewMyListingFn);
  const loadDbDraft = useServerFn(getMyListingDraftFn);
  const updateListing = useServerFn(updateMyListingFn);
  const [dbLoadError, setDbLoadError] = useState<string | null>(null);
  // Editing a database listing: load it from the server (ownership checked there); never touches the device draft.
  useEffect(() => { if (!dbEdit || draft || submitted) return; let live = true; loadDbDraft({ data: { id: dbEdit } }).then(d => { if (!live) return; if (d) setDraft({ ...d, kind: d.kind as ListingDraft["kind"], mode: d.mode as ListingDraft["mode"], checks: d.checks as ListingDraft["checks"] }); else setDbLoadError("This listing wasn’t found in your account."); }).catch((e: unknown) => live && setDbLoadError(e instanceof Error ? e.message : "Could not load this listing.")); return () => { live = false; }; }, [dbEdit, draft, submitted, loadDbDraft]);
  const [uploads, setUploads] = useState<{ name: string; url: string }[]>([]);
  const [staged, setStaged] = useState<File[]>([]);
  const [stagedPreviewUrls, setStagedPreviewUrls] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);

  // Keep stable object URLs for the preview gallery. Creating URLs during render
  // caused the gallery to reload on every state change and made multi-photo
  // navigation unreliable.
  useEffect(() => {
    const urls = staged.map(file => URL.createObjectURL(file));
    setStagedPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [staged]);

  useEffect(() => { if (dbEdit || !ready || draft || submitted) return; ownerActions.startDraft(edit); }, [ready, edit, draft, submitted]);
  useEffect(() => { if (!dbEdit && ready && !draft && data.draft && !submitted && data.editingId === (edit ?? null)) { setDraft(data.draft); setStep(Math.min(data.draftStep, 7)); } }, [ready, data.draft, data.draftStep, data.editingId, edit, draft, submitted]);
  // Autosave (device-local) shortly after each change.
  useEffect(() => { if (dbEdit || !draft || submitted) return; setSaving(true); const t = setTimeout(() => { if (!ownerActions.saveDraft(draft, step)) toast.error("Draft couldn’t be saved on this device"); setSaving(false); }, 500); return () => clearTimeout(t); }, [draft, step, submitted, dbEdit]);
  useEffect(() => () => uploads.forEach(u => URL.revokeObjectURL(u.url)), [uploads]);

  if (submitted) return <Shell><div className="wizard-success" role="status"><CheckCircle2 size={40}/><p className="kicker">STATUS · UNDER REVIEW</p><h2>Listing submitted for review</h2>
    {savedToDb ? <p>{autoApproved ? <>Your listing passed HouseProvider’s automated safety review and is <strong>live</strong> for seekers.</> : <>Your listing is saved to your account with the status <ListingStatusPill status="UNDER_REVIEW"/>. It is <strong>not live</strong> until the required review is complete.</>}</p> :
    <p>Your listing is saved on this device with the status <ListingStatusPill status="UNDER_REVIEW"/>. It is <strong>not live</strong> and <strong>not verified</strong>: real moderation and verification need the HouseProvider backend, which isn’t connected yet. No seeker can see it.</p>}
    <div className="wizard-nav"><Button asChild><Link to="/owner" search={{ tab: "listings" }}>Go to my listings</Link></Button><Button variant="outline" onClick={() => { setSubmitted(null); setSavedToDb(false); setDraft(null); setStep(0); ownerActions.startDraft(); }}>Create another</Button></div></div></Shell>;
  if (dbLoadError) return <Shell editing><div className="wizard-card" role="alert"><p>{dbLoadError}</p><Button asChild variant="outline"><Link to="/owner" search={{ tab: "listings" }}>Back to my listings</Link></Button></div></Shell>;
  if (!ready || !draft) return <Shell><div className="wizard-card" aria-busy="true"><Loader2 className="spin" size={22}/> Loading your draft…</div></Shell>;

  const set = <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) => { setDraft({ ...draft, [k]: v }); setErrors([]); };
  const toggle = <K extends "amenities" | "photos">(k: K, v: ListingDraft[K][number]) => { const arr = draft[k] as string[]; set(k, (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]) as ListingDraft[K]); };
  const go = (to: number) => { if (to > step) { for (let s = step; s < to; s++) { const e = s === 5 && (dbEdit || staged.length > 0 || uploads.length > 0) ? [] : validateStep(s, draft); if (e.length) { setStep(s); setErrors(e); return; } } } setErrors([]); setStep(to); requestAnimationFrame(() => heading.current?.focus()); };
  const publish = () => { for (let s = 0; s < 7; s++) { const e = s === 5 && (dbEdit || staged.length > 0 || uploads.length > 0) ? [] : validateStep(s, draft); if (e.length) { setStep(s); setErrors(e); return; } } if (dbEdit) { if (publishing) return; setPublishing(true); updateListing({ data: { id: dbEdit, draft } }).then(async r => { if (!r.ok) { toast.error(r.message); return; } const review = await autoReviewListing({ data: { id: r.id } }); setAutoApproved(review.published); setSavedToDb(true); setSubmitted(r.id); toast.success(review.published ? "Changes approved automatically and the listing is live" : "Changes submitted for review"); }).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save your changes.")).finally(() => setPublishing(false)); return; }
    if (!data.editingId) { if (publishing) return; setPublishing(true); createListing({ data: draft }).then(async r => {
      if (!r.ok) { toast.error(r.message); return; }
      ownerActions.discardDraft(); const failed = staged.length ? await uploadAll(r.id, staged) : 0; setStaged([]);
      const review = failed ? { published: false as const } : await autoReviewListing({ data: { id: r.id } });
      setAutoApproved(review.published); setSavedToDb(true); setSubmitted(r.id);
      toast.success(review.published ? "Listing approved automatically and is now live" : failed ? `Listing submitted for review — ${failed} photo${failed > 1 ? "s" : ""} couldn’t be uploaded; add them by editing the listing` : "Listing submitted for review");
    }).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not submit this listing.")).finally(() => setPublishing(false)); return; }
    const id = ownerActions.submit(); if (id) { setSubmitted(id); toast.success("Listing submitted for review"); } else toast.error("Nothing to submit"); };
  const previewImages = stagedPreviewUrls.length ? stagedPreviewUrls : uploads.map(upload => upload.url);
  const home = draftToHome(draft, "preview", previewImages[0] ?? undefined);

  return <Shell editing={!!data.editingId || !!dbEdit}>
    <ol className="wizard-progress" aria-label="Listing steps">{steps.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : ""}><button type="button" onClick={() => go(i)}><span>{i < step ? <Check size={12}/> : i + 1}</span>{s}</button></li>)}</ol>
    <div className="wizard-meter" aria-hidden><span style={{ width: `${((step + 1) / steps.length) * 100}%` }}/></div>
    <div className="wizard-card" key={step}>
      <div className="wizard-head"><div><p className="kicker">STEP {step + 1} OF {steps.length}</p><h2 ref={heading} tabIndex={-1}>{steps[step]}</h2></div><span className="autosave" aria-live="polite">{saving ? "Saving draft…" : data.draftSavedAt ? `Draft saved ${timeAgo(data.draftSavedAt)} · this device` : "Draft not saved yet"}</span></div>
      {errors.length > 0 && <div className="form-errors" role="alert"><strong>Please fix the following:</strong><ul>{errors.map(e => <li key={e}>{e}</li>)}</ul></div>}

      {step === 0 && <><div className="pill-row" role="radiogroup" aria-label="Intent">{(["Rent", "Buy"] as const).map(m => <button key={m} type="button" role="radio" aria-checked={draft.mode === m} className="pill" onClick={() => set("mode", m)}>{m === "Rent" ? "For rent" : "For sale"}</button>)}</div>
        <div className="choice-grid" role="radiogroup" aria-label="Property type">{kinds.map(k => <button key={k} type="button" role="radio" aria-checked={draft.kind === k} className="choice" onClick={() => set("kind", k)}>{k}</button>)}</div></>}
      {step === 1 && <div className="form-grid">
        <Field label="Country"><input value={draft.country} onChange={e => set("country", e.target.value)} placeholder="India" maxLength={80}/></Field>
        <Field label="State / Province"><input value={draft.state} onChange={e => set("state", e.target.value)} placeholder="e.g. Maharashtra" maxLength={80}/></Field>
        <Field label="City"><input value={draft.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Pune" maxLength={80}/></Field>
        <Field label="Locality"><input value={draft.locality} maxLength={60} placeholder="e.g. Wakad" onChange={e => set("locality", e.target.value)}/></Field>
        <Field label="Street address (optional, never shown publicly)" wide><input value={draft.address} maxLength={160} onChange={e => set("address", e.target.value)}/></Field>
        <p className="form-hint wide">A map pin will be added when a map service is connected.</p></div>}
      {step === 2 && <div className="form-grid">
        <Field label={draft.mode === "Rent" ? "Monthly rent (₹)" : "Asking price (₹)"}><input inputMode="numeric" value={draft.price} onChange={e => set("price", e.target.value.replace(/\D/g, ""))}/></Field>
        <Field label="Security deposit (₹)"><input inputMode="numeric" value={draft.deposit} onChange={e => set("deposit", e.target.value.replace(/\D/g, ""))}/></Field>
        <Field label="Available from (leave empty for now)"><input type="date" value={draft.availableFrom} onChange={e => set("availableFrom", e.target.value)}/></Field></div>}
      {step === 3 && <div className="form-grid">
        <Field label="BHK"><input inputMode="numeric" value={draft.beds} onChange={e => set("beds", e.target.value.replace(/\D/g, "").slice(0, 2))}/></Field>
        <Field label="Bathrooms"><input inputMode="numeric" value={draft.baths} onChange={e => set("baths", e.target.value.replace(/\D/g, "").slice(0, 2))}/></Field>
        <Field label="Area (sq.ft.)"><input inputMode="numeric" value={draft.area} onChange={e => set("area", e.target.value.replace(/\D/g, "").slice(0, 6))}/></Field>
        <Field label="Parking spaces"><select value={draft.parking} onChange={e => set("parking", e.target.value)}>{["0", "1", "2", "3"].map(p => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Furnishing"><select value={draft.furnishing} onChange={e => set("furnishing", e.target.value)}><option value="">Choose</option>{["Fully furnished", "Semi furnished", "Unfurnished"].map(f => <option key={f}>{f}</option>)}</select></Field>
        <Field label="Listing title (optional)"><input value={draft.title} maxLength={60} onChange={e => set("title", e.target.value)}/></Field>
        <Field label={`Description (${draft.description.length}/1200)`} wide><textarea rows={5} maxLength={1200} value={draft.description} onChange={e => set("description", e.target.value)} placeholder="Describe the light, layout and everyday feel. Only include facts that are true."/></Field></div>}
      {step === 3 && <ListingAssistant draft={draft} onApply={patch => { setDraft({ ...draft, ...patch }); setErrors([]); }}/>}
      {step === 4 && <div className="choice-grid">{amenityOptions.map(a => <button key={a} type="button" aria-pressed={draft.amenities.includes(a)} className="choice" onClick={() => toggle("amenities", a)}>{draft.amenities.includes(a) && <Check size={14}/>}{a}</button>)}</div>}
      {step === 5 && <>
        <p className="form-hint">Pick property photos for your listing. The first one becomes the cover.</p>
        {dbEdit ? <SavedPhotoUploader propertyId={dbEdit}/> : !data.editingId ? <StagedPhotoUploader files={staged} onChange={setStaged}/> : <>
        <label className="upload-drop"><ImagePlus size={20}/><span>Try uploading your own (preview only)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith("image/") && f.size < 10_000_000).slice(0, 8); setUploads(u => [...u, ...files.map(f => ({ name: f.name, url: URL.createObjectURL(f) }))]); }}/></label>
        {uploads.length > 0 && <div className="upload-list">{uploads.map(u => <figure key={u.url}><img src={u.url} alt={u.name}/><figcaption>{u.name}</figcaption></figure>)}</div>}
        <p className="form-hint">Uploaded files stay in this browser tab only and disappear on refresh. Nothing is stored until a storage service is connected.</p></>}</>}
      {step === 6 && <>
        <p className="form-hint">Your listing will go through HouseProvider’s verification process before it goes live. You don’t need to choose individual checks.</p>
        <div className="verification-auto-card">
          <div className="kicker">HOUSEPROVIDER VERIFICATION</div>
          <h3>We’ll check the important details automatically.</h3>
          <p>These checks help protect seekers from misleading or fraudulent listings.</p>
          <ul className="verification-auto-list">
            <li><strong>Listing details</strong><span>Checked for completeness and accuracy.</span></li>
            <li><strong>Photos</strong><span>Checked for relevance and duplicate or misleading images.</span></li>
            <li><strong>Location</strong><span>Checked using the location information you provide.</span></li>
            <li><strong>Phone</strong><span>Confirmed with OTP when phone verification is required.</span></li>
            <li><strong>Owner identity</strong><span>May require identity/KYC verification for trust and safety.</span></li>
            <li><strong>Availability</strong><span>Checked from the availability information you provide.</span></li>
          </ul>
          <p className="form-hint">Submitting a listing starts the review process. A listing is not published until the required checks and moderation are complete.</p>
        </div>
      </>}
      {step === 7 && <div className="preview-stage">
        <p className="demo-label"><span>PREVIEW</span>This is exactly how seekers would see your listing once approved.</p>
        <h3 className="preview-sub">Search card</h3><div className="preview-tile"><HomeTile home={home}/></div>
        <h3 className="preview-sub">Property page</h3>
        <div className="detail-page preview-detail"><PropertyDetailView home={home} images={previewImages} imageNote="Owner photo preview" disclaimer="Preview only — this listing has not been reviewed or verified." aside={<div className="detail-summary"><p className="kicker">AT A GLANCE</p><h3>{inr(home.price)}{home.mode === "Rent" && <small> / month</small>}</h3><div><span>Property type</span><strong>{home.kind}</strong></div><div><span>Deposit</span><strong>{inr(Number(draft.deposit) || 0)}</strong></div><div><span>Parking</span><strong>{draft.parking === "0" ? "None listed" : `${draft.parking} listed`}</strong></div><div><span>Availability</span><strong>{draft.availableFrom ? `From ${new Date(draft.availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Available now"}</strong></div><div><span>Verification</span><strong>Not verified</strong></div></div>}/></div></div>}
      {step === 8 && <div className="publish-step"><h3>Ready to submit?</h3><ul className="publish-list"><li>Status will be <ListingStatusPill status="UNDER_REVIEW"/> — it will not go live automatically.</li><li>No verification is granted on submission; checks are only requested.</li><li>In this demo the listing stays on this device. No marketplace receives it.</li></ul><Button onClick={publish} disabled={publishing}>Submit for review</Button></div>}

      <div className="wizard-nav"><Button variant="outline" disabled={step === 0} onClick={() => go(step - 1)}><ArrowLeft size={16}/> Previous</Button>
        {step < steps.length - 1 && <Button onClick={() => go(step + 1)}>{step === 6 ? "Preview listing" : step === 7 ? "Continue" : "Next"} <ArrowRight size={16}/></Button>}</div>
    </div>
    <DiscardLink/>
  </Shell>;
}
function DiscardLink() { const navigate = useNavigate(); return <button type="button" className="text-link discard" onClick={() => { ownerActions.discardDraft(); toast("Draft discarded"); navigate({ to: "/owner" }); }}>Discard draft</button>; }
function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) { return <label className={`field${wide ? " wide" : ""}`}><span>{label}</span>{children}</label>; }
function Shell({ children, editing }: { children: ReactNode; editing?: boolean }) {
  return <main className="dashboard-page wizard-page"><div className="wrap narrow">
    <Link to="/owner" className="text-link"><ArrowLeft size={16}/> Owner dashboard</Link>
    <div className="results-intro"><p className="kicker">FOR OWNERS</p><h1>{editing ? <>Edit your <em>listing.</em></> : <>List your <em>property.</em></>}</h1></div>
    <div className="demo-banner" role="note"><strong>Listing workspace.</strong> Drafts and submissions are linked to your HouseProvider account until you publish the listing.</div>
    {children}
  </div></main>;
}


