import { z } from "zod";
import pune from "@/assets/new-home-pune.jpg";
import mumbai from "@/assets/new-home-mumbai.jpg";
import bengaluru from "@/assets/new-home-bengaluru.jpg";
import house from "@/assets/new-home-house.jpg";
import type { Home, ListingStatus } from "./catalog";
import { createLocalStore, uid } from "./local-store";
import { emptyRecord, requestChecks, type VerificationKey, type VerificationRecord } from "./verification";
import type { VisitStatus } from "./visits";
import { track } from "./analytics";

/** Sample photos an owner can pick in demo mode. Uploaded files are never stored. */
export const demoPhotos = { living: pune, city: mumbai, dining: bengaluru, exterior: house } as const;
export type DemoPhoto = keyof typeof demoPhotos;
export const photoLabels: Record<DemoPhoto, string> = { living: "Living room", city: "City view", dining: "Dining", exterior: "Exterior" };

export type ListingDraft = {
  kind: Home["kind"] | ""; mode: Home["mode"]; country: string; state: string; city: string; locality: string; address: string; title: string;
  price: string; deposit: string; availableFrom: string; beds: string; baths: string; area: string; propertyAgeYears: string; floor: string; totalFloors: string;
  furnishing: string; parking: string; amenities: string[]; description: string; photos: DemoPhoto[]; checks: VerificationKey[];
  /** Owner's own extra points for the listing assistant (optional on drafts saved before Phase 4). */
  notes?: string;
  /** Assistant-drafted extras the owner accepted. Never published automatically. */
  aiExtras?: { highlights: string[]; amenitySummary: string; seoTitle: string; seoDescription: string; social: string };
};
export const emptyDraft = (): ListingDraft => ({ kind: "", mode: "Rent", country: "India", state: "", city: "", locality: "", address: "", title: "", price: "", deposit: "", availableFrom: "", beds: "", baths: "", area: "", propertyAgeYears: "", floor: "", totalFloors: "", furnishing: "", parking: "0", amenities: [], description: "", photos: [], checks: [] });

const num = (label: string, min = 0) => z.string().trim().min(1, `${label} is required`).refine(v => Number.isFinite(Number(v)) && Number(v) >= min, `${label} must be a number${min ? ` of at least ${min}` : ""}`);
/** Per-step validation for the 9-step wizard. Steps without a schema have no required fields. */
export const stepSchemas: Record<number, z.ZodTypeAny> = {
  0: z.object({ kind: z.string().min(1, "Choose a property type") }),
  1: z.object({ country: z.string().min(1, "Choose a country"), state: z.string().trim().min(1, "Enter a state").max(80), city: z.string().trim().min(1, "Enter a city").max(80), locality: z.string().trim().min(2, "Enter a locality").max(60), address: z.string().trim().max(160) }),
  2: z.object({ price: num("Price", 1000), deposit: num("Deposit"), availableFrom: z.string() }),
  3: z.object({ beds: num("BHK", 0), baths: num("Bathrooms", 0), area: num("Area", 50), furnishing: z.string().min(1, "Choose furnishing"), title: z.string().trim().max(60), description: z.string().trim().min(30, "Describe the home in at least 30 characters").max(1200) }),
  5: z.object({ photos: z.array(z.string()).min(1, "Pick at least one photo") }),
};
export function validateStep(step: number, draft: ListingDraft): string[] {
  const schema = stepSchemas[step]; if (!schema) return [];
  const r = schema.safeParse(draft); return r.success ? [] : r.error.issues.map(i => i.message);
}

export type OwnerListing = {
  id: string; draft: ListingDraft; status: ListingStatus; verification: VerificationRecord; demo: boolean;
  createdAt: string; updatedAt: string; archived: boolean; metrics: { views: number; saves: number; enquiries: number; visits: number };
};
export type OwnerVisit = { id: string; listingId: string; visitor: string; date: string; slot: string; status: VisitStatus };
type OwnerState = { listings: OwnerListing[]; visits: OwnerVisit[]; draft: ListingDraft | null; draftStep: number; draftSavedAt: string | null; editingId: string | null };

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const daysFrom = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
function seed(): OwnerState {
  const base = (over: Partial<ListingDraft>): ListingDraft => ({ ...emptyDraft(), ...over });
  const listings: OwnerListing[] = [
    { id: "demo-a", demo: true, archived: false, status: "ACTIVE", createdAt: hoursAgo(400), updatedAt: hoursAgo(4), verification: requestChecks(emptyRecord(), ["phone", "ownerIdentity"], hoursAgo(90)), metrics: { views: 412, saves: 38, enquiries: 11, visits: 4 },
      draft: base({ kind: "Apartment", city: "Pune", locality: "Wakad", title: "Garden-facing 2 BHK", price: "28000", deposit: "84000", beds: "2", baths: "2", area: "1010", furnishing: "Semi furnished", parking: "1", amenities: ["Balcony", "Lift", "Parking"], description: "A bright demo apartment facing a shared garden, with a balcony off the living room and a practical kitchen.", photos: ["living", "dining"] }) },
    { id: "demo-b", demo: true, archived: false, status: "PAUSED", createdAt: hoursAgo(900), updatedAt: hoursAgo(72), verification: emptyRecord(), metrics: { views: 186, saves: 12, enquiries: 3, visits: 1 },
      draft: base({ kind: "Room", city: "Bengaluru", locality: "HSR Layout", title: "Private room near the park", price: "14000", deposit: "28000", availableFrom: daysFrom(16), beds: "1", baths: "1", area: "220", furnishing: "Fully furnished", amenities: ["Power backup"], description: "A demo private room in a shared flat, walking distance from a neighbourhood park and cafés.", photos: ["dining"] }) },
    { id: "demo-c", demo: true, archived: false, status: "RENTED", createdAt: hoursAgo(2000), updatedAt: hoursAgo(300), verification: emptyRecord(), metrics: { views: 655, saves: 51, enquiries: 19, visits: 7 },
      draft: base({ kind: "House", city: "Nagpur", locality: "Civil Lines", title: "Quiet 3 BHK house", price: "42000", deposit: "126000", beds: "3", baths: "3", area: "1900", furnishing: "Unfurnished", parking: "2", amenities: ["Garden", "Parking", "Terrace"], description: "A demo independent house with a small garden, a terrace and generous rooms on a quiet lane.", photos: ["exterior"] }) },
  ];
  const visits: OwnerVisit[] = [
    { id: "ov1", listingId: "demo-a", visitor: "Demo visitor 1", date: daysFrom(1), slot: "11:00", status: "REQUESTED" },
    { id: "ov2", listingId: "demo-a", visitor: "Demo visitor 2", date: daysFrom(2), slot: "16:00", status: "CONFIRMED" },
    { id: "ov3", listingId: "demo-b", visitor: "Demo visitor 3", date: daysFrom(3), slot: "12:00", status: "REQUESTED" },
  ];
  return { listings, visits, draft: null, draftStep: 0, draftSavedAt: null, editingId: null };
}

const store = createLocalStore<OwnerState>("houseprovider.owner-demo.v1", seed);
export const useOwnerData = store.use;

export function draftToHome(d: ListingDraft, id = "preview", previewImage?: string): Home {
  const beds = Number(d.beds) || 0;
  return {
    slug: `draft-${id}`, name: d.title.trim() || `${beds ? `${beds} BHK ` : ""}${d.kind || "Home"} in ${d.locality || "your locality"}`,
    city: d.city || "City", neighborhood: d.locality || "Locality", mode: d.mode, kind: (d.kind || "Apartment") as Home["kind"],
    price: Number(d.price) || 0, beds, baths: Number(d.baths) || 0, area: Number(d.area) || 0, furnishing: d.furnishing || "Furnishing not set",
    image: previewImage || demoPhotos[d.photos[0] ?? "living"], description: d.description || "No description yet.", features: d.amenities,
  };
}
export function freshness(l: OwnerListing) {
  const a = l.draft.availableFrom && new Date(l.draft.availableFrom) > new Date() ? `Available from ${new Date(l.draft.availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Available now";
  return a;
}

export const ownerActions = {
  startDraft(editId?: string) {
    store.update(s => {
      const editing = editId ? s.listings.find(l => l.id === editId) : undefined;
      if (editing) return { ...s, draft: { ...editing.draft }, draftStep: 0, editingId: editId ?? null, draftSavedAt: null };
      if (s.draft && !s.editingId) return s; // resume the existing new-listing draft
      track("LISTING_CREATED");
      return { ...s, draft: emptyDraft(), draftStep: 0, editingId: null, draftSavedAt: null };
    });
  },
  /** Autosave: persists to this device only. */
  saveDraft(draft: ListingDraft, step: number): boolean { return store.update(s => ({ ...s, draft, draftStep: step, draftSavedAt: new Date().toISOString() })); },
  discardDraft() { store.update(s => ({ ...s, draft: null, draftStep: 0, draftSavedAt: null, editingId: null })); },
  /** Submits for review. Always UNDER_REVIEW — only real moderation may activate or verify a listing. */
  submit(): string | null {
    const s = store.get(); if (!s.draft) return null;
    const now = new Date().toISOString(); const id = s.editingId ?? `local-${uid()}`;
    const verification = requestChecks(s.editingId ? s.listings.find(l => l.id === id)?.verification ?? emptyRecord() : emptyRecord(), [...s.draft.checks, "listingReview", "photos"]);
    const draft = s.draft;
    store.update(st => {
      const existing = st.listings.find(l => l.id === id);
      const next: OwnerListing = existing ? { ...existing, draft, status: "UNDER_REVIEW", updatedAt: now, verification }
        : { id, draft, status: "UNDER_REVIEW", verification, demo: false, archived: false, createdAt: now, updatedAt: now, metrics: { views: 0, saves: 0, enquiries: 0, visits: 0 } };
      return { ...st, listings: existing ? st.listings.map(l => l.id === id ? next : l) : [next, ...st.listings], draft: null, draftStep: 0, draftSavedAt: null, editingId: null };
    });
    track("LISTING_PUBLISHED", id);
    return id;
  },
  setStatus(id: string, status: ListingStatus) { store.update(s => ({ ...s, listings: s.listings.map(l => l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l) })); },
  archive(id: string) { store.update(s => ({ ...s, listings: s.listings.map(l => l.id === id ? { ...l, archived: true, updatedAt: new Date().toISOString() } : l) })); },
  restore(id: string) { store.update(s => ({ ...s, listings: s.listings.map(l => l.id === id ? { ...l, archived: false } : l) })); },
  /** Owner reconfirms availability. This refreshes freshness and requests the availability check; it does not verify it. */
  confirmAvailability(id: string) { store.update(s => ({ ...s, listings: s.listings.map(l => l.id === id ? { ...l, updatedAt: new Date().toISOString(), verification: requestChecks(l.verification, ["availability"]) } : l) })); },
  requestVerification(id: string, keys: VerificationKey[]) { store.update(s => ({ ...s, listings: s.listings.map(l => l.id === id ? { ...l, verification: requestChecks(l.verification, keys) } : l) })); },
  setVisitStatus(id: string, status: VisitStatus) { store.update(s => ({ ...s, visits: s.visits.map(v => v.id === id ? { ...v, status } : v) })); },
  reset() { store.reset(); },
};
