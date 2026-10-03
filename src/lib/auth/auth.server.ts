/**
 * Server-only Better Auth instance (email + password, optional Google OAuth, DB-backed sessions).
 * Passwords are hashed by the library (scrypt); sessions live in the Session table
 * and the browser only receives a signed HttpOnly cookie.
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { requireDb } from "@/lib/db/client.server";
import { AUTH_ERRORS } from "./roles";
import { AUTH_RATE_LIMITS } from "./rate-limit";
import { writeAudit } from "./audit.server";

async function buildAuth() {
  const db = await requireDb();
  const secret = process.env["BETTER_AUTH_SECRET"];
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured on the server.");
  const googleClientId = process.env["GOOGLE_CLIENT_ID"];
  const googleClientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  return betterAuth({
    secret,
    baseURL: process.env["BETTER_AUTH_URL"] || undefined,
    trustedOrigins: async (request) => {
      const list = ["https://*.lovable.app", "https://*.lovableproject.com", "http://localhost:8080"];
      if (request) list.push(new URL(request.url).origin);
      return list;
    },
    database: prismaAdapter(db, { provider: "postgresql" }),
    socialProviders: googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      // No email provider yet: verification is not required and no emails are sent.
      requireEmailVerification: false,
    },
    user: {
      fields: { emailVerified: "emailConfirmed" },
      additionalFields: {
        // input:false => a client can never set these during signup/update.
        role: { type: "string", required: false, defaultValue: "USER", input: false },
        status: { type: "string", required: false, defaultValue: "ACTIVE", input: false },
        phone: { type: "string", required: false, input: true },
      },
    },
    account: { modelName: "authAccount", fields: { accountId: "providerAccountId" } },
    verification: { modelName: "authVerification" },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false }, // always re-validate against the DB so suspensions apply immediately
    },
    rateLimit: { enabled: true, storage: "database", modelName: "rateLimit", window: 60, max: 60, customRules: { ...AUTH_RATE_LIMITS } },
    advanced: {
      useSecureCookies: true,
      // Preview runs inside an iframe, so cookies must be SameSite=None; Secure; Partitioned.
      defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: "none", partitioned: true },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, role: "USER", status: "ACTIVE", phone: (user as { phone?: string }).phone?.trim() || null } }),
          after: async (user) => {
            await db.profile.create({ data: { userId: user.id, fullName: user.name || null } });
            await writeAudit({ actorId: user.id, action: "auth.signup", entityType: "User", entityId: user.id });
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const u = await db.user.findUnique({ where: { id: session.userId }, select: { status: true } });
            if (!u || u.status === "ACTIVE") return;
            await writeAudit({ actorId: session.userId, action: "auth.login.blocked", entityType: "User", entityId: session.userId, result: "DENIED", metadata: { status: u.status } });
            const code = u.status === "SUSPENDED" ? AUTH_ERRORS.SUSPENDED : u.status === "DEACTIVATED" ? AUTH_ERRORS.DEACTIVATED : AUTH_ERRORS.PENDING;
            throw new APIError("FORBIDDEN", { message: code, code });
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email") {
          const s = ctx.context.newSession;
          if (s) await writeAudit({ actorId: s.user.id, action: "auth.login", entityType: "User", entityId: s.user.id });
          else await writeAudit({ actorId: null, action: "auth.login.failed", entityType: "User", result: "DENIED" });
        }
        // Dispatch exposes the endpoint's declared pattern, not the request path, so OAuth callbacks match "/callback/:id".
        if (ctx.path === "/callback/:id") {
          const s = ctx.context.newSession;
          const provider = (ctx.params as { id?: string } | undefined)?.id;
          if (s) await writeAudit({ actorId: s.user.id, action: "auth.login", entityType: "User", entityId: s.user.id, metadata: { provider: provider ?? "social" } });
        }
      }),
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-out") {
          const session = await getSessionFromCtx(ctx).catch(() => null);
          if (session) await writeAudit({ actorId: session.user.id, action: "auth.logout", entityType: "User", entityId: session.user.id });
        }
      }),
    },
    plugins: [tanstackStartCookies()],
  });
}

type Auth = Awaited<ReturnType<typeof buildAuth>>;
const g = globalThis as unknown as { __hpAuth?: Auth };

/** In production a fresh instance per request (DB connections can't be shared across requests on the edge). */
export async function getAuth(): Promise<Auth> {
  if (process.env["NODE_ENV"] !== "production") return (g.__hpAuth ??= await buildAuth());
  return buildAuth();
}
