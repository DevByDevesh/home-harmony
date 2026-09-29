import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * One-time FIRST Super admin bootstrap (server-side only).
 * - Needs SUPER_ADMIN_BOOTSTRAP_SECRET (server env, min 24 chars) sent in the `x-bootstrap-secret` header.
 * - Disabled when SUPER_ADMIN_BOOTSTRAP_ENABLED=false, when the secret is unset,
 *   or permanently after one successful use (recorded in AuditLog).
 * - Promotes an EXISTING active account only; never creates users, never accepts a role value.
 * - Locks out after 5 failed attempts per hour. Never logs or stores the secret.
 */
const DONE = "role.super_admin_bootstrap";
const DENIED = "bootstrap.denied";
const json = (status: number, message: string) =>
  new Response(JSON.stringify({ ok: status === 200, message }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const digest = (s: string) => createHash("sha256").update(s).digest();

export const Route = createFileRoute("/api/public/bootstrap-super-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SUPER_ADMIN_BOOTSTRAP_SECRET"];
        if (process.env["SUPER_ADMIN_BOOTSTRAP_ENABLED"] === "false" || !secret || secret.length < 24) return json(404, "Not available.");
        const { getDb } = await import("@/lib/db/client.server");
        const db = await getDb();
        if (!db) return json(503, "Database not configured.");

        if (await db.auditLog.findFirst({ where: { action: DONE, result: "SUCCESS" }, select: { id: true } }))
          return json(410, "Bootstrap was already used and is permanently disabled.");
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

        await db.$transaction([
          db.user.update({ where: { id: user.id }, data: { role: "SUPER_ADMIN" } }),
          db.auditLog.create({ data: { actorId: null, action: DONE, entityType: "User", entityId: user.id, result: "SUCCESS", metadata: { from: user.role, to: "SUPER_ADMIN", via: "bootstrap" } } }),
        ]);
        return json(200, "Account promoted to Super admin. Bootstrap is now permanently disabled.");
      },
    },
  },
});
