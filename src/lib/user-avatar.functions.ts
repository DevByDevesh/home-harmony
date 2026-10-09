import { createServerFn } from "@tanstack/react-start";

function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }

export const uploadMyAvatarFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Choose a profile photo to upload.");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("Choose a profile photo to upload.");
    return { file };
  })
  .handler(async ({ data }) => {
    try {
      const { requireUser } = await import("./auth/guards.server");
      const { requireDb } = await import("./db/client.server");
      const { writeAudit } = await import("./auth/audit.server");
      const storage = await import("./storage/user-avatars.server");
      const me = await requireUser();
      const file = data.file;
      if (!(file.type in storage.IMAGE_TYPES)) return { ok: false as const, message: "Choose a JPEG, PNG or WebP image." };
      if (file.size < 100) return { ok: false as const, message: "That image is empty or damaged." };
      if (file.size > storage.MAX_IMAGE_BYTES) return { ok: false as const, message: "Profile photos must be 5 MB or smaller." };
      const bytes = new Uint8Array(await file.arrayBuffer());
      const real = storage.sniffImage(bytes);
      if (!real || real !== file.type) return { ok: false as const, message: "That file isn’t a valid JPEG, PNG or WebP image." };
      const db = await requireDb();
      const current = await db.user.findUnique({ where: { id: me.id }, select: { image: true } });
      const key = `avatars/${me.id}/${crypto.randomUUID()}.${storage.IMAGE_TYPES[real]}`;
      const url = await storage.putAvatar(key, bytes, real);
      try {
        await db.user.update({ where: { id: me.id }, data: { image: url } });
      } catch (e) {
        await storage.removeAvatar(key).catch(() => {});
        throw e;
      }
      await writeAudit({ actorId: me.id, action: "profile.avatar.update", entityType: "User", entityId: me.id, metadata: { mimeType: real, sizeBytes: file.size, replacedExisting: Boolean(current?.image) } });
      return { ok: true as const, image: url };
    } catch (e) { rethrow(e); }
  });
