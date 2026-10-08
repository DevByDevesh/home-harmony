/** Only same-origin paths are honoured after sign-in. */
export function safeRedirect(r?: string) {
  if (!r || !r.startsWith("/") || r.startsWith("//")) return "/dashboard";
  try { const u = new URL(r, "http://x"); return u.origin === "http://x" ? u.pathname + u.search : "/dashboard"; } catch { return "/dashboard"; }
}
