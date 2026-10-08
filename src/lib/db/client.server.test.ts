import test from "node:test";
import assert from "node:assert/strict";
import { DB_POOL_MAX } from "./client.server.ts";

test("keeps the application PostgreSQL pool below the staging Supavisor session client limit", () => {
  assert.equal(DB_POOL_MAX, 4);
});
