/**
 * Server-only Prisma client. `.server.ts` keeps it out of browser bundles.
 * Returns null when DATABASE_URL is not configured so the demo app keeps working.
 * Uses the pg driver adapter (no native query engine) to run in the edge runtime.
 */
import type { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __hpPrisma?: PrismaClient };

/**
 * Supabase shared session mode currently limits HouseProvider staging to 15
 * client connections. Keep each server process conservative so concurrent
 * requests cannot exhaust that shared limit.
 */
export const DB_POOL_MAX = 4;

export function isDatabaseConfigured() {
  return Boolean(process.env["DATABASE_URL"]);
}

export async function getDb(): Promise<PrismaClient | null> {
  const url = process.env["DATABASE_URL"];
  if (!url) return null;
  if (globalForPrisma.__hpPrisma) return globalForPrisma.__hpPrisma;
  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([import("@prisma/client"), import("@prisma/adapter-pg")]);
  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      max: DB_POOL_MAX,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    }),
  });
  // Keep one Prisma client/pool per server process. Creating a new client for
  // every request creates a new pg connection pool and can exhaust the DB limit.
  globalForPrisma.__hpPrisma = client;
  return client;
}

export async function requireDb(): Promise<PrismaClient> {
  const db = await getDb();
  if (!db) throw new Error("Database not configured: set DATABASE_URL on the server.");
  return db;
}
