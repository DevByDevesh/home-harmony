import { createLocalStore, uid } from "./local-store";

/** Agent CRM demo data. Names are fictional placeholders; no real contacts are stored or contacted. */
export type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "VISIT_SCHEDULED" | "NEGOTIATION" | "CONVERTED" | "LOST";
export const leadStatuses: LeadStatus[] = ["NEW", "CONTACTED", "INTERESTED", "VISIT_SCHEDULED", "NEGOTIATION", "CONVERTED", "LOST"];
export const leadLabel: Record<LeadStatus, string> = { NEW: "New", CONTACTED: "Contacted", INTERESTED: "Interested", VISIT_SCHEDULED: "Visit scheduled", NEGOTIATION: "Negotiation", CONVERTED: "Converted", LOST: "Lost" };
export type LeadNote = { id: string; text: string; at: string };
export type Lead = { id: string; name: string; propertySlug: string; budget: string; location: string; status: LeadStatus; lastContact: string | null; nextFollowUp: string | null; notes: LeadNote[] };

const day = (d: number) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const seed = (): { leads: Lead[] } => ({ leads: [
  { id: "l1", name: "Demo Lead · Aarav", propertySlug: "2bhk-apartment-hinjewadi-pune-2101", budget: "₹25K–₹32K / month", location: "Hinjewadi, Pune", status: "NEW", lastContact: null, nextFollowUp: day(0), notes: [] },
  { id: "l2", name: "Demo Lead · Meera", propertySlug: "2bhk-apartment-indiranagar-bengaluru-2103", budget: "₹50K–₹58K / month", location: "Indiranagar, Bengaluru", status: "CONTACTED", lastContact: day(-2), nextFollowUp: day(1), notes: [{ id: "n1", text: "Prefers semi-furnished, moving next month.", at: new Date().toISOString() }] },
  { id: "l3", name: "Demo Lead · Kabir", propertySlug: "3bhk-apartment-bandra-mumbai-2102", budget: "₹1.2L–₹1.4L / month", location: "Bandra West, Mumbai", status: "INTERESTED", lastContact: day(-1), nextFollowUp: day(2), notes: [] },
  { id: "l4", name: "Demo Lead · Ishita", propertySlug: "4bhk-house-baner-pune-2104", budget: "₹3–3.3 Cr", location: "Baner, Pune", status: "VISIT_SCHEDULED", lastContact: day(-3), nextFollowUp: day(3), notes: [] },
  { id: "l5", name: "Demo Lead · Rohan", propertySlug: "3bhk-apartment-greater-kailash-delhi-2106", budget: "₹90K–₹1L / month", location: "Greater Kailash, Delhi NCR", status: "NEGOTIATION", lastContact: day(-1), nextFollowUp: day(-1), notes: [] },
  { id: "l6", name: "Demo Lead · Sana", propertySlug: "1bhk-apartment-adyar-chennai-2107", budget: "₹22K–₹27K / month", location: "Adyar, Chennai", status: "CONVERTED", lastContact: day(-6), nextFollowUp: null, notes: [] },
  { id: "l7", name: "Demo Lead · Dev", propertySlug: "2bhk-apartment-dharampeth-nagpur-2109", budget: "₹20K / month", location: "Dharampeth, Nagpur", status: "LOST", lastContact: day(-9), nextFollowUp: null, notes: [{ id: "n2", text: "Chose a different area.", at: new Date().toISOString() }] },
] });

const store = createLocalStore("houseprovider.agent-demo.v1", seed);
export const useAgentData = store.use;
const touch = (id: string, fn: (l: Lead) => Lead) => store.update(s => ({ leads: s.leads.map(l => l.id === id ? fn(l) : l) }));
export const agentActions = {
  setStatus(id: string, status: LeadStatus) { touch(id, l => ({ ...l, status, lastContact: status === "NEW" ? l.lastContact : day(0) })); },
  addNote(id: string, text: string) { const t = text.trim().slice(0, 500); if (t) touch(id, l => ({ ...l, notes: [{ id: uid(), text: t, at: new Date().toISOString() }, ...l.notes] })); },
  setFollowUp(id: string, date: string | null) { touch(id, l => ({ ...l, nextFollowUp: date })); },
  reset() { store.reset(); },
};
