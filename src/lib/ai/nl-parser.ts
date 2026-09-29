import { amenityOptions, cities, listings } from "../catalog";
import type { Filters } from "../filters";

/**
 * Deterministic local parser: natural language → the SAME Filters object the manual search uses.
 * It only extracts what it can recognise with confidence and reports everything else as "unsure",
 * so nothing is invented from ambiguous text.
 */
export type ParsedSearch = {
  filters: Filters;
  /** Human-readable list of what was understood, in query order. */
  understood: string[];
  /** Things mentioned that could not be applied confidently. */
  unsure: string[];
  /** Preferences we noticed but cannot filter on, because listings don't carry that data yet. */
  notes: string[];
};

const cityAliases: Record<string, string> = {
  pune: "Pune", mumbai: "Mumbai", bombay: "Mumbai", "navi mumbai": "Mumbai", thane: "Mumbai",
  bengaluru: "Bengaluru", bangalore: "Bengaluru", delhi: "Delhi NCR", "new delhi": "Delhi NCR", "delhi ncr": "Delhi NCR", ncr: "Delhi NCR", gurgaon: "Delhi NCR", gurugram: "Delhi NCR", noida: "Delhi NCR",
  hyderabad: "Hyderabad", chennai: "Chennai", madras: "Chennai", ahmedabad: "Ahmedabad", nagpur: "Nagpur",
};
/** Localities we can place with confidence: every catalog neighbourhood plus well-known areas. */
const knownLocalities: Record<string, string> = {
  ...Object.fromEntries(listings.map(l => [l.neighborhood.toLowerCase(), l.city])),
  hinjewadi: "Pune", wakad: "Pune", baner: "Pune", kharadi: "Pune", "viman nagar": "Pune", kothrud: "Pune", aundh: "Pune", "magarpatta": "Pune", hadapsar: "Pune",
  powai: "Mumbai", andheri: "Mumbai", bandra: "Mumbai", worli: "Mumbai", "lower parel": "Mumbai",
  whitefield: "Bengaluru", koramangala: "Bengaluru", hsr: "Bengaluru", "hsr layout": "Bengaluru", "electronic city": "Bengaluru", marathahalli: "Bengaluru",
  "cyber city": "Delhi NCR", dwarka: "Delhi NCR", saket: "Delhi NCR",
  gachibowli: "Hyderabad", "hitech city": "Hyderabad", madhapur: "Hyderabad", kondapur: "Hyderabad",
  "omr": "Chennai", velachery: "Chennai", "anna nagar": "Chennai", "sg highway": "Ahmedabad", satellite: "Ahmedabad", sitabuldi: "Nagpur",
};
const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase()).replace(/\bHsr\b/, "HSR").replace(/\bOmr\b/, "OMR").replace(/\bSg\b/, "SG").replace(/\bNcr\b/, "NCR");
const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, single: 1, double: 2 };
const amenityPatterns: [RegExp, string][] = [
  [/\bbalcon(y|ies)\b/, "Balcony"], [/\b(lift|elevator)s?\b/, "Lift"], [/\bpower\s*back-?up\b|\bgenerator\b/, "Power backup"],
  [/\b(ac|a\/c|air[\s-]?condition(ed|ing|er)?)\b/, "Air conditioning"], [/\bgarden\b/, "Garden"], [/\bterrace\b/, "Terrace"], [/\bstudy( room)?\b/, "Study"],
];

/** "30k" → 30000, "1.2 cr" → 12000000, "25,000" → 25000. Returns undefined for bare small numbers. */
function amount(num: string, unit?: string): number | undefined {
  const v = Number(num.replace(/,/g, ""));
  if (!Number.isFinite(v) || v <= 0) return undefined;
  const u = (unit ?? "").toLowerCase();
  if (u === "k" || u === "thousand") return Math.round(v * 1_000);
  if (u === "l" || u === "lakh" || u === "lakhs" || u === "lac" || u === "lacs") return Math.round(v * 100_000);
  if (u === "cr" || u === "crore" || u === "crores") return Math.round(v * 10_000_000);
  return v >= 1000 ? v : undefined; // "under 30" is ambiguous — don't guess
}
const AMT = String.raw`(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|l|crores?|cr)?\b`;

export function parseQuery(raw: string): ParsedSearch {
  const text = ` ${raw.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ")} `;
  const f: Filters = {}; const understood: string[] = []; const unsure: string[] = []; const notes: string[] = [];

  // Intent
  if (/\b(buy|purchase|for sale|to own|resale)\b/.test(text)) { f.mode = "Buy"; understood.push("To buy"); }
  else if (/\b(rent|rental|lease|on rent|to let)\b/.test(text)) { f.mode = "Rent"; understood.push("To rent"); }

  // Property type
  const kinds: [RegExp, string][] = [[/\b(pg|paying guest|hostel)\b/, "PG"], [/\b(office|shop|showroom|commercial|warehouse)\b/, "Commercial"], [/\b(house|villa|bungalow|independent home|row ?house)\b/, "House"], [/\b(apartment|flat|condo)s?\b/, "Apartment"], [/\b(room|1 ?rk)\b/, "Room"]];
  const kind = kinds.find(([re]) => re.test(text)); if (kind) { f.kind = kind[1]; understood.push(kind[1]); }

  // BHK / bedrooms
  const bhk = text.match(/\b(\d|one|two|three|four|five|single|double)\s*-?\s*(bhk|b\.h\.k|bed(room)?s?|br)\b/);
  if (bhk) { const b = words[bhk[1]!] ?? Number(bhk[1]); if (b >= 1 && b <= 9) { f.beds = String(Math.min(b, 4)); understood.push(b >= 4 ? "4+ BHK" : `${b} BHK`); } }

  // Bathrooms
  const bath = text.match(/\b(\d|one|two|three|four)\s*(bath(room)?s?|washrooms?|toilets?)\b/);
  if (bath) { const b = words[bath[1]!] ?? Number(bath[1]); f.baths = String(b); understood.push(`${b}+ bathrooms`); }

  // Budget: ranges first, then maximums, then minimums.
  const range = text.match(new RegExp(String.raw`\bbetween\s+${AMT}\s*(?:and|to|-)\s*${AMT}`)) ?? text.match(new RegExp(String.raw`${AMT}\s*(?:-|to)\s*${AMT}`));
  const maxM = text.match(new RegExp(String.raw`\b(?:under|below|upto|up to|max(?:imum)?|within|less than|not more than|budget(?: is| of)?|around|about)\s*(?:of\s*)?${AMT}`));
  const minM = text.match(new RegExp(String.raw`\b(?:above|over|more than|at least|minimum|min|from)\s*${AMT}`));
  if (range) {
    const lo = amount(range[1]!, range[2] ?? range[4]), hi = amount(range[3]!, range[4]);
    if (lo && hi && lo < hi) { f.min = String(lo); f.max = String(hi); understood.push(`₹${lo.toLocaleString("en-IN")}–₹${hi.toLocaleString("en-IN")}`); }
    else unsure.push("I couldn't confidently understand your budget range.");
  } else {
    if (maxM) { const v = amount(maxM[1]!, maxM[2]); if (v) { f.max = String(v); understood.push(`Up to ₹${v.toLocaleString("en-IN")}`); } else unsure.push(`I couldn't tell what “${maxM[1]}” means as a budget. Try “30k” or “₹30,000”.`); }
    if (minM && !/\bfrom\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(text)) { const v = amount(minM[1]!, minM[2]); if (v) { f.min = String(v); understood.push(`From ₹${v.toLocaleString("en-IN")}`); } }
  }

  // Furnishing (check "semi" and "un" before plain "furnished")
  if (/\bsemi[\s-]?furnished\b/.test(text)) { f.furnishing = "Semi furnished"; understood.push("Semi furnished"); }
  else if (/\b(un-?furnished|bare shell|without furniture)\b/.test(text)) { f.furnishing = "Unfurnished"; understood.push("Unfurnished"); }
  else if (/\b(fully[\s-]?)?furnished\b/.test(text)) { f.furnishing = "Fully furnished"; understood.push("Fully furnished"); }

  // Parking
  if (/\b(no|without|dont need|don t need)\s+(car\s+)?parking\b/.test(text)) notes.push("You mentioned not needing parking, so parking isn't filtered.");
  else if (/\b(parking|car park|garage|covered parking)\b/.test(text)) { f.parking = "1"; understood.push("Parking"); }

  // Amenities (parking handled above)
  const amen = amenityPatterns.filter(([re]) => re.test(text)).map(([, a]) => a).filter(a => amenityOptions.includes(a));
  if (amen.length) { f.amenities = amen.join(","); understood.push(...amen); }

  // Availability
  if (/\b(immediate(ly)?|available now|ready to move|move in now|asap|right away)\b/.test(text)) { f.available = "1"; understood.push("Available now"); }
  else if (/\b(from|by|in)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/.test(text)) notes.push("Move-in dates aren't filterable yet — check each home's availability.");

  // Bachelor-friendly: listings don't record tenant preferences, so it's a note, not a filter.
  if (/\b(bachelors?|single (person|guy|girl|man|woman)|students?|working professionals?)\b/.test(text)) notes.push("Bachelor-friendly noted — listings don't record tenant preferences yet, so it isn't filtered.");
  if (/\b(i work|office is|working|work at|work in|near my office|college|university)\b/.test(text)) notes.push("Commute times aren't available yet — we searched by the area you named instead.");

  // Location: known localities first (longest match), then cities, then an honest "unsure".
  const locality = Object.keys(knownLocalities).sort((a, b) => b.length - a.length).find(l => new RegExp(String.raw`\b${l}\b`).test(text));
  const city = Object.keys(cityAliases).sort((a, b) => b.length - a.length).find(c => new RegExp(String.raw`\b${c}\b`).test(text));
  if (locality) { const name = listings.find(l => l.neighborhood.toLowerCase() === locality)?.neighborhood ?? titleCase(locality); f.location = name; understood.unshift(name); }
  if (city) { f.city = cityAliases[city]!; understood.unshift(f.city); }
  else if (locality && cities.includes(knownLocalities[locality]!)) { /* locality already narrows the city */ }
  if (!locality && !city) {
    const loc = text.match(/\b(?:in|near|at|around|close to)\s+([a-z][a-z ]{2,30}?)(?=\s+(?:under|below|with|for|and|budget|within|upto|up|max|,|\.)|\s*$|,)/);
    if (loc && !/^(a|the|my|budget|rent|range|furnished)\b/.test(loc[1]!.trim())) unsure.push(`I couldn't confidently understand your location “${loc[1]!.trim()}”. Try a city or a locality like Hinjewadi.`);
  }

  return { filters: f, understood, unsure, notes };
}

export const EXAMPLE_QUERIES = ["2BHK in Hinjewadi under 30k", "furnished 2BHK in Pune with parking", "I need a house in Nagpur under ₹25,000"];
