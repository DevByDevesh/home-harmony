/**
 * Server-only storage for owner property photos (Supabase Storage bucket `property-images`, public read).
 * Credentials come from STORAGE_SUPABASE_URL / STORAGE_SUPABASE_SERVICE_KEY and never leave the server.
 * Writes happen only here, after the caller's ownership has been checked against PostgreSQL.
 */
const BUCKET = "property-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type ImageMime = keyof typeof IMAGE_TYPES;
export const UPLOAD_PREFIX = "properties/";

function cfg() {
  const url = process.env["STORAGE_SUPABASE_URL"]?.replace(/\/$/, ""); const key = process.env["STORAGE_SUPABASE_SERVICE_KEY"];
  if (!url || !key) throw new Error("Photo storage isn’t configured.");
  return { url, headers: { apikey: key, ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }) } };
}

/** Checks the file's real signature, not just its declared type. */
export function sniffImage(b: Uint8Array): ImageMime | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function publicImageUrl(key: string) { return `${cfg().url}/storage/v1/object/public/${BUCKET}/${key}`; }

export async function putImage(key: string, bytes: Uint8Array, type: ImageMime) {
  const { url, headers } = cfg();
  const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${key}`, { method: "POST", headers: { ...headers, "content-type": type, "x-upsert": "false", "cache-control": "31536000" }, body: new Blob([bytes as BlobPart], { type }) });
  if (!r.ok) throw new Error("The photo couldn’t be stored. Please try again.");
}

export async function removeImages(keys: string[]) {
  if (!keys.length) return;
  const { url, headers } = cfg();
  const r = await fetch(`${url}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ prefixes: keys }) });
  if (!r.ok) throw new Error("The photo couldn’t be removed from storage.");
}
