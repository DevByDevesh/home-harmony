/**
 * Owner photo uploads. Identity comes from the session; the property must belong to the caller
 * (checked in the database query). Files are validated by size, declared type and real signature.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type OwnerImage = { id: string; url: string; altText: string; sortOrder: number };
const id = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const MAX_PER_LISTING = 20;
function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }
const fail = (message: string) => ({ ok: false as const, message });

async function owned(propertyId: string) {
  const { requireRole } = await import("./auth/guards.server");
  const { AREA_ROLES } = await import("./auth/roles");
  const me = await requireRole(AREA_ROLES.owner, "owner.listings");
  const { requireDb } = await import("./db/client.server"); const db = await requireDb();
  const p = await db.property.findFirst({ where: { id: propertyId, ownerId: me.id }, select: { id: true, title: true } });
  return { me, db, p };
}
async function deny(actorId: string, propertyId: string, action: string) {
  const { writeAudit } = await import("./auth/audit.server");
  await writeAudit({ actorId, action, entityType: "Property", entityId: propertyId, result: "DENIED", metadata: { reason: "not owner" } });
}
const NOT_YOURS = "You can only change photos on your own listings.";

async function listImages(db: Awaited<ReturnType<typeof owned>>["db"], propertyId: string): Promise<OwnerImage[]> {
  const { UPLOAD_PREFIX } = await import("./storage/property-images.server");
  const rows = await db.propertyImage.findMany({ where: { propertyId, storageKey: { startsWith: UPLOAD_PREFIX } }, orderBy: { sortOrder: "asc" } });
  return rows.map((r) => ({ id: r.id, url: r.url ?? "", altText: r.altText, sortOrder: r.sortOrder }));
}

export const listMyPropertyImagesFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ propertyId: id }).strict().parse(d))
  .handler(async ({ data }) => {
    try { const { db, p } = await owned(data.propertyId); return p ? await listImages(db, p.id) : []; } catch (e) { rethrow(e); }
  });

export const uploadPropertyImageFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Expected a file upload.");
    const propertyId = id.parse(d.get("propertyId")); const file = d.get("file");
    if (!(file instanceof File)) throw new Error("Choose a photo to upload.");
    return { propertyId, file };
  })
  .handler(async ({ data }) => {
    try {
      const s = await import("./storage/property-images.server");
      const { me, db, p } = await owned(data.propertyId);
      if (!p) { await deny(me.id, data.propertyId, "property.image.upload"); return fail(NOT_YOURS); }
      if (!(data.file.type in s.IMAGE_TYPES)) return fail("Only JPEG, PNG or WebP photos can be uploaded.");
      if (data.file.size > s.MAX_IMAGE_BYTES) return fail("Photos must be 5 MB or smaller.");
      if (data.file.size < 100) return fail("That file is empty or damaged.");
      const bytes = new Uint8Array(await data.file.arrayBuffer());
      const real = s.sniffImage(bytes);
      if (!real || real !== data.file.type) return fail("That file isn’t a valid JPEG, PNG or WebP image.");
      const existing = await db.propertyImage.findMany({ where: { propertyId: p.id, storageKey: { startsWith: s.UPLOAD_PREFIX } }, select: { sortOrder: true } });
      if (existing.length >= MAX_PER_LISTING) return fail(`A listing can have up to ${MAX_PER_LISTING} uploaded photos.`);
      const key = `${s.UPLOAD_PREFIX}${p.id}/${crypto.randomUUID()}.${s.IMAGE_TYPES[real]}`;
      await s.putImage(key, bytes, real);
      const sortOrder = existing.reduce((m, x) => Math.max(m, x.sortOrder), 999) + 1;
      await db.propertyImage.create({ data: { propertyId: p.id, storageKey: key, url: s.publicImageUrl(key), altText: `${p.title} (owner photo)`, sortOrder } });
      return { ok: true as const, images: await listImages(db, p.id) };
    } catch (e) { rethrow(e); }
  });

export const reorderPropertyImagesFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ propertyId: id, order: z.array(id).max(MAX_PER_LISTING) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const { me, db, p } = await owned(data.propertyId);
      if (!p) { await deny(me.id, data.propertyId, "property.image.reorder"); return fail(NOT_YOURS); }
      const cur = await listImages(db, p.id);
      if (cur.length !== data.order.length || !cur.every((c) => data.order.includes(c.id))) return fail("Photos changed — please refresh and try again.");
      await db.$transaction(data.order.map((imgId, i) => db.propertyImage.updateMany({ where: { id: imgId, propertyId: p.id }, data: { sortOrder: 1000 + i } })));
      return { ok: true as const, images: await listImages(db, p.id) };
    } catch (e) { rethrow(e); }
  });

export const deletePropertyImageFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ propertyId: id, imageId: id }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const s = await import("./storage/property-images.server");
      const { me, db, p } = await owned(data.propertyId);
      if (!p) { await deny(me.id, data.propertyId, "property.image.delete"); return fail(NOT_YOURS); }
      const img = await db.propertyImage.findFirst({ where: { id: data.imageId, propertyId: p.id, storageKey: { startsWith: s.UPLOAD_PREFIX } } });
      if (!img) return fail("Photo not found.");
      await s.removeImages([img.storageKey]);
      await db.propertyImage.delete({ where: { id: img.id } });
      return { ok: true as const, images: await listImages(db, p.id) };
    } catch (e) { rethrow(e); }
  });
