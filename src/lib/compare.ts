import { inr, type Listing } from "./catalog";

export const COMPARE_LIMIT = 4;
/** Neutral, factual differences only. Never ranks or recommends a "best" property. */
export function neutralDifferences(items: Listing[]): string[] {
  if (items.length < 2) return [];
  const notes: string[] = [];
  const by = <T,>(pick: (l: Listing) => number, dir: 1 | -1) => [...items].sort((a, b) => dir * (pick(a) - pick(b)))[0]!;
  const sameMode = items.every(i => i.mode === items[0]!.mode);
  if (sameMode) { const low = by(l => l.price, 1); notes.push(`${low.name} has the lowest listed ${low.mode === "Rent" ? "monthly rent" : "asking price"} (${inr(low.price)}).`); }
  const big = by(l => l.area, -1); notes.push(`${big.name} has the largest listed area (${big.area.toLocaleString("en-IN")} sq.ft.).`);
  const withDeposit = items.filter(i => i.deposit > 0);
  if (withDeposit.length > 1) { const d = [...withDeposit].sort((a, b) => a.deposit - b.deposit)[0]!; notes.push(`${d.name} lists the lowest deposit (${inr(d.deposit)}).`); }
  const noBrokerage = items.filter(i => i.brokerage === "None");
  if (noBrokerage.length && noBrokerage.length < items.length) notes.push(`${noBrokerage.map(i => i.name).join(" and ")} ${noBrokerage.length > 1 ? "list" : "lists"} no brokerage.`);
  const noParking = items.filter(i => i.parking === 0);
  if (noParking.length) notes.push(`${noParking.map(i => i.name).join(" and ")} ${noParking.length > 1 ? "list" : "lists"} no parking.`);
  notes.push("Commute times are not listed yet, so they can’t be compared.");
  return notes;
}
