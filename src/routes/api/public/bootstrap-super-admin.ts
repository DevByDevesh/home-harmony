import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * One-time first platform Owner bootstrap. The legacy endpoint path/env names are
 * retained for deployment compatibility; the resulting role is OWNER, never ADMIN.
 */
const DONE = "role.owner_bootstrap";
const DENIED = "bootstrap.denied";
const json = (status: number, message: string) => new Response(JSON.stringify({ ok: status === 200, message }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const digest = (s: string) => createHash("sha256").update(s).digest();

export const Route = createFileRoute("/api/public/bootstrap-super-admin")({
  server: { handlers: { POST: async ({ request }) => {
    const secret = process.env["SUPER_ADMIN_BOOTSTRAP_SECRET"];
    if (process.env["SUPER_ADMIN_BOOTSTRAP_ENABLED"] === "false" || !secret || secret.length < 24) return json(404, "Not available.");
    const { getDb } = await import("@/lib/db/client.server");
    const db = await getDb();
    if (!db) return json(503, "Database not configured.");
    if (await db.auditLog.findFirst({ where: { action: DONE, result: "SUCCESS" }, select: { id: true } })) return json(410, "Owner bootstrap was already used and is permanently disabled.");
    const recentFails = await db.auditLog.count({ where: { action: DENIED, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    if (recentFails >= 5) return json(429, "Too many failed attempts. Try again later.");
    const given = request.headers.get("x-bootstrap-secret") ?? "";
    if (!timingSafeEqual(digest(given), digest(secret))) {
      await db.auditLog.create({ data: { actorId: null, action: DENIED, entityType: "User", result: "DENIED", metadata: { reason: "bad_secret" } } });
      return json(401, "Not authorised.");
    }
    const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json(400, "Send JSON with an email only.");
    const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, role: true, status: true } });
    if (!user || user.status !== "ACTIVE") {
      await db.auditLog.create({ data: { actorId: null, action: DENIED, entityType: "User", result: "DENIED", metadata: { reason: "no_eligible_account" } } });
      return json(404, "No active account with that email. Sign up normally first.");
    }
    const existingOwner = await db.user.findFirst({ where: { role: "OWNER" }, select: { id: true } });
    if (existingOwner && existingOwner.id !== user.id) return json(409, "A platform Owner already exists.");
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { role: "OWNER" } }),
      db.auditLog.create({ data: { actorId: null, action: DONE, entityType: "User", entityId: user.id, result: "SUCCESS", metadata: { from: user.role, to: "OWNER", via: "bootstrap" } } }),
    ]);
    return json(200, "Account promoted to Platform Owner. Bootstrap is now permanently disabled.");
  } } },
});
