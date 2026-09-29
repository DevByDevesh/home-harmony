/**
 * Deterministic listing writer. It only rearranges facts the owner supplied — no facts are added.
 * Missing information is reported instead of guessed.
 */
export type ListingFacts = {
  kind: string; mode: "Rent" | "Buy"; city: string; locality: string; price: string; deposit: string;
  beds: string; baths: string; area: string; furnishing: string; parking: string; amenities: string[]; availableFrom: string;
  /** Free-text points the owner typed, e.g. "Near IT Park". Quoted as the owner's own words. */
  notes: string;
};
export type ListingContent = { title: string; description: string; highlights: string[]; amenitySummary: string; seoTitle: string; seoDescription: string; social: string };
export type ListingContentKey = keyof ListingContent;
export const contentLabels: Record<ListingContentKey, string> = { title: "Listing title", description: "Property description", highlights: "Highlights", amenitySummary: "Amenity summary", seoTitle: "SEO title", seoDescription: "SEO description", social: "Social media caption" };

const rupee = (v: string) => `₹${Number(v).toLocaleString("en-IN")}`;
const clamp = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

export function missingFacts(f: ListingFacts): string[] {
  const m: string[] = [];
  if (!f.kind) m.push("property type"); if (!f.locality && !f.city) m.push("location"); if (!f.price) m.push(f.mode === "Rent" ? "monthly rent" : "asking price");
  if (!f.beds && f.kind !== "Commercial") m.push("BHK"); if (!f.furnishing) m.push("furnishing"); if (!f.area) m.push("area");
  return m;
}
export function hasEnoughFacts(f: ListingFacts) { return !!f.kind && !!(f.locality || f.city); }

export function writeListing(f: ListingFacts, variant = 0): ListingContent {
  const v = ((variant % 3) + 3) % 3;
  const kind = f.kind || "property";
  const bhk = f.beds && f.kind !== "Commercial" ? `${f.beds} BHK` : "";
  const place = [f.locality, f.city].filter(Boolean).join(", ");
  const where = f.locality || f.city;
  const furn = f.furnishing ? f.furnishing.toLowerCase() : "";
  const notes = f.notes.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).slice(0, 4);
  const parking = Number(f.parking) > 0 ? `${f.parking} parking space${f.parking === "1" ? "" : "s"}` : "";
  const amenities = f.amenities.filter(a => a !== "Parking");
  const price = f.price ? (f.mode === "Rent" ? `${rupee(f.price)}/month` : rupee(f.price)) : "";

  const headline = [f.furnishing && f.furnishing !== "Unfurnished" ? f.furnishing : "", bhk, kind].filter(Boolean).join(" ");
  const titles = [
    `${headline}${where ? ` in ${where}` : ""}`,
    `${headline}${where ? `, ${where}` : ""}${f.mode === "Rent" ? " for rent" : " for sale"}`,
    `${where ? `${where}: ` : ""}${headline}${parking ? " with parking" : ""}`,
  ];
  const title = clamp(titles[v]!, 60);

  const s: string[] = [];
  const opener = [
    `${/^[aeiou]/i.test([furn, bhk, kind].filter(Boolean).join(" ")) ? "An" : "A"} ${[furn, bhk, kind.toLowerCase()].filter(Boolean).join(" ")}${f.mode === "Rent" ? " available for rent" : " for sale"}${place ? ` in ${place}` : ""}.`,
    `This ${[bhk, kind.toLowerCase()].filter(Boolean).join(" ")}${place ? ` in ${place}` : ""} is listed ${f.mode === "Rent" ? "for rent" : "for sale"}${furn ? ` and comes ${furn}` : ""}.`,
    `${place ? `Located in ${place}, this` : "This"} ${[bhk, kind.toLowerCase()].filter(Boolean).join(" ")} is offered ${f.mode === "Rent" ? "on rent" : "for sale"}${furn ? `, ${furn}` : ""}.`,
  ];
  s.push(opener[v]!);
  const size = [f.area ? `${Number(f.area).toLocaleString("en-IN")} sq.ft.` : "", f.baths ? `${f.baths} bathroom${f.baths === "1" ? "" : "s"}` : "", parking].filter(Boolean);
  if (size.length) s.push(`It offers ${size.join(", ")}.`);
  if (amenities.length) s.push(`Listed amenities: ${amenities.join(", ")}.`);
  if (notes.length) s.push(`The owner notes: ${notes.join("; ")}.`);
  if (price) s.push(`${f.mode === "Rent" ? "Rent" : "Asking price"}: ${price}${f.mode === "Rent" && f.deposit ? `, with a security deposit of ${rupee(f.deposit)}` : ""}.`);
  s.push(f.availableFrom ? `Available from ${new Date(f.availableFrom).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` : "Contact the owner to confirm availability.");
  const description = s.join(" ");

  const highlights = [bhk && `${bhk} ${kind.toLowerCase()}`, f.area && `${Number(f.area).toLocaleString("en-IN")} sq.ft.`, f.furnishing, parking && `${parking[0]!.toUpperCase()}${parking.slice(1)}`, ...amenities.slice(0, 3), ...notes.slice(0, 2)].filter((x): x is string => !!x).slice(0, 6);
  const amenitySummary = amenities.length || parking ? `This home lists ${[...amenities, parking].filter(Boolean).join(", ")}.` : "No amenities have been added yet.";
  const seoTitle = clamp(`${headline}${where ? ` in ${place}` : ""}${price ? ` | ${price}` : ""} | HouseProvider`, 70);
  const seoDescription = clamp([`${headline}${place ? ` in ${place}` : ""}`, size.join(", "), amenities.slice(0, 3).join(", "), price].filter(Boolean).join(" · ") + ".", 160);
  const tag = (x: string) => `#${x.replace(/[^a-z0-9]/gi, "")}`;
  const socialOpeners = ["Now listed on HouseProvider:", "New on HouseProvider —", "Looking for a home? Just listed:"];
  const social = [`${socialOpeners[v]} ${headline}${where ? ` in ${where}` : ""}.`, price && price, [where && tag(where), f.city && f.city !== where ? tag(f.city) : "", bhk && tag(bhk), f.mode === "Rent" ? "#ForRent" : "#ForSale"].filter(Boolean).join(" ")].filter(Boolean).join(" ");

  return { title, description, highlights, amenitySummary, seoTitle, seoDescription, social };
}
