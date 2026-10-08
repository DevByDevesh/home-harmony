export type DisplayPriceMode = "Rent" | "Buy";

export function formatDisplayPrice(mode: DisplayPriceMode, price: number): string {
  if (!Number.isFinite(price) || price < 0) return "₹0";
  if (mode === "Rent") return `₹${Math.round(price).toLocaleString("en-IN")}`;
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000) return `₹${(price / 100_000).toFixed(2)} Lakh`;
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}
