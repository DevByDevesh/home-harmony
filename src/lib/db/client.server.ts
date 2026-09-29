/**
 * Server-only Prisma client. `.server.ts` keeps it out of browser bundles.
 * Returns null when DATABASE_URL is not configured so the demo app keeps working.
 * Uses the pg driver adapter (no native query engine) to run in the edge runtime.
 */
import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __hpPrisma?: PrismaClient };

export function isDatabaseConfigured() {
  return Boolean(process.env["DATABASE_URL"]);
}

export async function getDb(): Promise<PrismaClient | null> {
  const url = process.env["DATABASE_URL"];
  if (!url) return null;
  if (globalForPrisma.__hpPrisma) return globalForPrisma.__hpPrisma;
  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([import("@prisma/client"), import("@prisma/adapter-pg")]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  // Reuse across dev hot reloads to avoid exhausting connections.
  if (process.env["NODE_ENV"] !== "production") globalForPrisma.__hpPrisma = client;
  return client;
}

export async function requireDb(): Promise<PrismaClient> {
  const db = await getDb();
  if (!db) throw new Error("Database not configured: set DATABASE_URL on the server.");
  return db;
}
