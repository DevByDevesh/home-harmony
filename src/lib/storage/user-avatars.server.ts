/** Server-only storage helpers for account avatars. Reuses the configured public image bucket. */
import { IMAGE_TYPES, MAX_IMAGE_BYTES, sniffImage } from "./property-images.server";

export { IMAGE_TYPES, MAX_IMAGE_BYTES, sniffImage };

export async function putAvatar(key: string, bytes: Uint8Array, type: keyof typeof IMAGE_TYPES) {
  const url = process.env["STORAGE_SUPABASE_URL"]?.replace(/\/$/, "");
  const secret = process.env["STORAGE_SUPABASE_SERVICE_KEY"];
  if (!url || !secret) throw new Error("Profile photo storage isn’t configured.");
  const headers = { apikey: secret, ...(secret.startsWith("sb_") ? {} : { Authorization: `Bearer ${secret}` }) };
  const r = await fetch(`${url}/storage/v1/object/property-images/${key}`, {
    method: "POST",
    headers: { ...headers, "content-type": type, "x-upsert": "false", "cache-control": "31536000" },
    body: new Blob([bytes as BlobPart], { type }),
  });
  if (!r.ok) throw new Error("The profile photo couldn’t be stored. Please try again.");
  return `${url}/storage/v1/object/public/property-images/${key}`;
}

export async function removeAvatar(key: string) {
  const url = process.env["STORAGE_SUPABASE_URL"]?.replace(/\/$/, "");
  const secret = process.env["STORAGE_SUPABASE_SERVICE_KEY"];
  if (!url || !secret) return;
  const headers = { apikey: secret, ...(secret.startsWith("sb_") ? {} : { Authorization: `Bearer ${secret}` }) };
  await fetch(`${url}/storage/v1/object/property-images`, {
    method: "DELETE",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
  });
}
