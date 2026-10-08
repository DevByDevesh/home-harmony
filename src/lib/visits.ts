export type VisitStatus = "REQUESTED" | "CONFIRMED" | "RESCHEDULED" | "COMPLETED" | "CANCELLED";
export type Visit = { id: string; slug: string; date: string; slot: string; note?: string | undefined; status: VisitStatus; createdAt: string };
/** Allowed transitions — a backend will enforce these when owners accept, reject or reschedule. */
export const visitTransitions: Record<VisitStatus, VisitStatus[]> = {
  REQUESTED: ["CONFIRMED", "RESCHEDULED", "CANCELLED"], CONFIRMED: ["RESCHEDULED", "COMPLETED", "CANCELLED"],
  RESCHEDULED: ["CONFIRMED", "CANCELLED"], COMPLETED: [], CANCELLED: [],
};
export const statusLabel: Record<VisitStatus, string> = { REQUESTED: "Requested", CONFIRMED: "Confirmed", RESCHEDULED: "Rescheduled", COMPLETED: "Completed", CANCELLED: "Cancelled" };
const ALL_SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
export function toISODate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
/** Demo availability: fixed slots, past times hidden for today, Sundays closed. */
export function slotsFor(dateISO: string, now = new Date()): string[] {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  if (date.getDay() === 0) return [];
  if (dateISO === toISODate(now)) return ALL_SLOTS.filter(s => Number(s.slice(0, 2)) > now.getHours() + 1);
  return ALL_SLOTS;
}
export function formatVisitDate(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
