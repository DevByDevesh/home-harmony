/** Wizard photo uploads. Saved listings upload straight to storage; new listings stage files until "Submit for review". */
import { ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deletePropertyImageFn, listMyPropertyImagesFn, reorderPropertyImagesFn, uploadPropertyImageFn, type OwnerImage } from "@/lib/property-images.functions";

export const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 5 * 1024 * 1024;
/** Client-side pre-check; the server re-validates type, size and file signature. */
export function checkFiles(list: File[]) {
  const ok: File[] = [];
  for (const f of list) {
    if (!ALLOWED.includes(f.type)) toast.error(`${f.name}: only JPEG, PNG or WebP photos can be uploaded.`);
    else if (f.size > MAX_BYTES) toast.error(`${f.name}: photos must be 5 MB or smaller.`);
    else ok.push(f);
  }
  return ok;
}
export async function uploadAll(propertyId: string, files: File[]) {
  let failed = 0;
  for (const f of files) {
    const fd = new FormData(); fd.set("propertyId", propertyId); fd.set("file", f);
    try { const r = await uploadPropertyImageFn({ data: fd }); if (!r.ok) { failed++; toast.error(`${f.name}: ${r.message}`); } } catch (e) { failed++; toast.error(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`); }
  }
  return failed;
}

type Row = { key: string; url: string; label: string };
function List({ rows, move, remove, busy }: { rows: Row[]; move: (i: number, d: -1 | 1) => void; remove: (i: number) => void; busy: boolean }) {
  if (!rows.length) return null;
  return <ol className="upload-list" aria-label="Your photos">{rows.map((r, i) => <li key={r.key}><figure><img src={r.url} alt={r.label}/><figcaption>{i === 0 ? "Cover · " : `${i + 1} · `}{r.label}</figcaption></figure>
    <div className="dash-row-actions"><Button type="button" size="sm" variant="outline" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move photo ${i + 1} earlier`}>←</Button><Button type="button" size="sm" variant="outline" disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Move photo ${i + 1} later`}>→</Button><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}>Remove</Button></div></li>)}</ol>;
}

/** Saved database listing: every change is stored immediately. */
export function SavedPhotoUploader({ propertyId }: { propertyId: string }) {
  const [imgs, setImgs] = useState<OwnerImage[] | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { listMyPropertyImagesFn({ data: { propertyId } }).then(setImgs).catch(() => setImgs([])); }, [propertyId]);
  const apply = (r: { ok: true; images: OwnerImage[] } | { ok: false; message: string }) => { if (r.ok) setImgs(r.images); else toast.error(r.message); };
  const add = async (files: File[]) => { const ok = checkFiles(files); if (!ok.length) return; setBusy(true); const failed = await uploadAll(propertyId, ok); setImgs(await listMyPropertyImagesFn({ data: { propertyId } })); setBusy(false); if (ok.length > failed) toast.success(`${ok.length - failed} photo${ok.length - failed > 1 ? "s" : ""} uploaded`); };
  const move = async (i: number, d: -1 | 1) => { if (!imgs) return; const o = imgs.map(x => x.id); [o[i], o[i + d]] = [o[i + d]!, o[i]!]; setBusy(true); try { apply(await reorderPropertyImagesFn({ data: { propertyId, order: o } })); } finally { setBusy(false); } };
  const remove = async (i: number) => { if (!imgs) return; setBusy(true); try { apply(await deletePropertyImageFn({ data: { propertyId, imageId: imgs[i]!.id } })); } finally { setBusy(false); } };
  return <>
    <Drop busy={busy} label="Upload your own photos" onFiles={f => void add(f)}/>
    {imgs === null ? <p className="form-hint"><Loader2 className="spin" size={14}/> Loading your photos…</p> : <List rows={imgs.map((m, i) => ({ key: m.id, url: m.url, label: `Photo ${i + 1}` }))} move={(i, d) => void move(i, d)} remove={i => void remove(i)} busy={busy}/>}
    <p className="form-hint">JPEG, PNG or WebP, up to 5 MB each. Your own photos are saved to this listing straight away and appear before any sample photos; the first one is the cover.</p>
  </>;
}

/** New listing: files wait in this tab and upload right after the listing is submitted. */
export function StagedPhotoUploader({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { const u = files.map(f => URL.createObjectURL(f)); setUrls(u); return () => u.forEach(x => URL.revokeObjectURL(x)); }, [files]);
  const move = (i: number, d: -1 | 1) => { const n = [...files]; [n[i], n[i + d]] = [n[i + d]!, n[i]!]; onChange(n); };
  return <>
    <Drop busy={false} label="Upload your own photos" onFiles={f => onChange([...files, ...checkFiles(f)].slice(0, 20))}/>
    <List rows={files.map((f, i) => ({ key: `${f.name}-${f.size}-${f.lastModified}-${i}`, url: urls[i] ?? "", label: f.name }))} move={move} remove={i => onChange(files.filter((_, j) => j !== i))} busy={false}/>
    <p className="form-hint">JPEG, PNG or WebP, up to 5 MB each. These upload when you submit the listing, in this order; the first one becomes the cover.</p>
  </>;
}

function Drop({ busy, label, onFiles }: { busy: boolean; label: string; onFiles: (f: File[]) => void }) {
  return <label className="upload-drop">{busy ? <Loader2 className="spin" size={20}/> : <ImagePlus size={20}/>}<span>{busy ? "Uploading…" : label}</span>
    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}/></label>;
}
