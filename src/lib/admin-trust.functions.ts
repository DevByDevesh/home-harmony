/**
 * Admin live data: verification review, audit log and reports from PostgreSQL.
 * Every call re-checks the admin permission on the server and audits changes.
 * A verification decision also recomputes the listing's verification status and
 * notifies the requester in-app (notifications are never emailed or pushed).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { verificationTypeLabel } from "./admin/config";

function rethrow(e: unknown): never { if (e instanceof Error) throw new Error(e.message); throw e; }
async function guard(p: "verification.review" | "audit.view" | "reports.moderate") { const { requirePermission } = await import("./auth/guards.server"); return requirePermission(p); }
async function db() { const { requireDb } = await import("./db/client.server"); return requireDb(); }
async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, string>) { const { writeAudit } = await import("./auth/audit.server"); await writeAudit({ actorId, action, entityType, entityId, metadata }); }
const id = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);
const first = (n: string | null | undefined) => n || "—";

// ---- Verification review ----

export type AdminLiveVerification = { id: string; type: string; status: string; subject: string; property: string; reviewer: string; submittedAt: string; updatedAt: string; decidedAt: string | null };

export const adminListVerificationsFn = createServerFn({ method: "GET" }).handler(async (): Promise<AdminLiveVerification[]> => {
  try {
    await guard("verification.review");
    const rows = await (await db()).verification.findMany({
      orderBy: { updatedAt: "desc" }, take: 300,
      select: { id: true, type: true, status: true, submittedAt: true, updatedAt: true, decidedAt: true, user: { select: { name: true } }, property: { select: { title: true } }, reviewer: { select: { name: true } } },
    });
    return rows.map(v => ({ id: v.id, type: v.type, status: v.status, subject: first(v.user.name), property: v.property?.title ?? "—", reviewer: first(v.reviewer?.name), submittedAt: v.submittedAt.toISOString(), updatedAt: v.updatedAt.toISOString(), decidedAt: v.decidedAt?.toISOString() ?? null }));
  } catch (e) { rethrow(e); }
});

/** Review transitions. `revert` only returns a check to the queue — it never notifies the requester. */
const veriMoves: Record<string, { from: string[]; to: "IN_REVIEW" | "VERIFIED" | "REJECTED" | "PENDING" }> = {
  start: { from: ["PENDING"], to: "IN_REVIEW" },
  approve: { from: ["IN_REVIEW"], to: "VERIFIED" },
  reject: { from: ["IN_REVIEW", "PENDING"], to: "REJECTED" },
  revert: { from: ["IN_REVIEW"], to: "PENDING" },
};

/** Listing verification derives from its checks: any rejection fails it; only all-pass verifies it. */
async function recomputePropertyVerification(tx: Prisma.TransactionClient, propertyId: string) {
  const rows = await tx.verification.findMany({ where: { propertyId }, select: { status: true } });
  const s = rows.map(r => r.status);
  const next: "NOT_REQUESTED" | "VERIFIED" | "REJECTED" | "IN_REVIEW" | "PENDING" =
    !s.length ? "NOT_REQUESTED" : s.every(x => x === "VERIFIED") ? "VERIFIED" : s.includes("REJECTED") ? "REJECTED" : s.includes("IN_REVIEW") ? "IN_REVIEW" : "PENDING";
  await tx.property.update({ where: { id: propertyId }, data: { verificationStatus: next } });
}

export const adminSetVerificationStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id, action: z.enum(["start", "approve", "reject", "revert"]) }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("verification.review"); const m = veriMoves[data.action]!;
      const d = await db();
      return await d.$transaction(async (tx) => {
        const v = await tx.verification.findUnique({ where: { id: data.id }, select: { type: true, status: true, userId: true, propertyId: true, property: { select: { title: true, slug: true } } } });
        if (!v) return { ok: false as const, message: "Verification check not found." };
        if (!m.from.includes(v.status)) return { ok: false as const, message: "This check can’t take that action in its current status." };
        const decision = m.to === "VERIFIED" || m.to === "REJECTED";
        const upd = await tx.verification.updateMany({
          where: { id: data.id, status: v.status },
          data: { status: m.to, reviewerId: m.to === "PENDING" ? null : u.id, ...(decision ? { decidedAt: new Date() } : {}) },
        });
        if (!upd.count) return { ok: false as const, message: "This check changed meanwhile. Refresh and try again." };
        if (v.propertyId) await recomputePropertyVerification(tx, v.propertyId);
        if (decision) {
          const { notify } = await import("./db/repositories/engagement.server");
          const label = verificationTypeLabel[v.type as keyof typeof verificationTypeLabel] ?? v.type;
          await notify(tx, v.userId, "VERIFICATION", m.to === "VERIFIED" ? "Verification passed" : "Verification rejected", `${label}${v.property ? ` · ${v.property.title}` : ""}`, { verificationId: data.id, ...(v.property ? { slug: v.property.slug } : {}) });
        }
        await audit(u.id, `admin.verification.${data.action}`, "Verification", data.id, { to: m.to });
        return { ok: true as const };
      });
    } catch (e) { rethrow(e); }
  });

// ---- Audit log ----

export type AdminAuditEntry = { id: string; at: string; actor: string; action: string; entityType: string; entityId: string; result: string };

export const adminListAuditFn = createServerFn({ method: "GET" }).handler(async (): Promise<AdminAuditEntry[]> => {
  try {
    await guard("audit.view");
    const rows = await (await db()).auditLog.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      select: { id: true, action: true, entityType: true, entityId: true, result: true, createdAt: true, actor: { select: { name: true } } },
    });
    return rows.map(a => ({ id: a.id, at: a.createdAt.toISOString(), actor: first(a.actor?.name), action: a.action, entityType: a.entityType, entityId: a.entityId ?? "", result: a.result }));
  } catch (e) { rethrow(e); }
});

// ---- Reports ----

export type AdminLiveReport = { id: string; category: string; status: string; priority: string; summary: string; reporter: string; subject: string; property: string; assignee: string; createdAt: string };

export const adminListReportsFn = createServerFn({ method: "GET" }).handler(async (): Promise<AdminLiveReport[]> => {
  try {
    await guard("reports.moderate");
    const rows = await (await db()).report.findMany({
      orderBy: { createdAt: "desc" }, take: 300,
      select: { id: true, category: true, status: true, priority: true, summary: true, createdAt: true, reporter: { select: { name: true } }, subjectUser: { select: { name: true } }, property: { select: { title: true } }, assignee: { select: { name: true } } },
    });
    return rows.map(r => ({ id: r.id, category: r.category, status: r.status, priority: r.priority, summary: r.summary, reporter: first(r.reporter.name), subject: first(r.subjectUser?.name), property: r.property?.title ?? "—", assignee: first(r.assignee?.name), createdAt: r.createdAt.toISOString() }));
  } catch (e) { rethrow(e); }
});


export const adminUpdateReportFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id,
    action: z.enum(["start", "resolve", "dismiss", "reopen"]),
  }).strict().parse(d))
  .handler(async ({ data }) => {
    try {
      const u = await guard("reports.moderate");
      const d = await db();
      const report = await d.report.findUnique({ where: { id: data.id }, select: { status: true } });
      if (!report) return { ok: false as const, message: "Report not found." };
      const moves: Record<string, { from: string[]; to: "IN_REVIEW" | "RESOLVED" | "DISMISSED" | "OPEN" }> = {
        start: { from: ["OPEN"], to: "IN_REVIEW" },
        resolve: { from: ["IN_REVIEW", "OPEN"], to: "RESOLVED" },
        dismiss: { from: ["IN_REVIEW", "OPEN"], to: "DISMISSED" },
        reopen: { from: ["RESOLVED", "DISMISSED"], to: "OPEN" },
      };
      const move = moves[data.action]!;
      if (!move.from.includes(report.status)) return { ok: false as const, message: "This report can’t take that action in its current status." };
      const updated = await d.report.updateMany({
        where: { id: data.id, status: report.status },
        data: { status: move.to, resolvedAt: move.to === "RESOLVED" || move.to === "DISMISSED" ? new Date() : null },
      });
      if (!updated.count) return { ok: false as const, message: "This report changed meanwhile. Refresh and try again." };
      await audit(u.id, `admin.report.${data.action}`, "Report", data.id, { to: move.to });
      return { ok: true as const };
    } catch (e) { rethrow(e); }
  });
