export type OwnerContactRequestType = "PHONE" | "CALL";
export type OwnerContactRequestStatus = "REQUESTED" | "ACCEPTED" | "REJECTED";

export function canTransitionContactRequest(
  from: OwnerContactRequestStatus,
  to: OwnerContactRequestStatus,
) {
  return from === "REQUESTED" && (to === "ACCEPTED" || to === "REJECTED");
}

export function canRevealOwnerPhone(status: OwnerContactRequestStatus) {
  return status === "ACCEPTED";
}

export function validateCallPreference(date: string, time: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return false;
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(3));
  if (hour > 23 || minute > 59) return false;
  const preferred = new Date(`${date}T${time}:00`);
  return Number.isFinite(preferred.getTime()) && preferred.getTime() > now.getTime();
}
