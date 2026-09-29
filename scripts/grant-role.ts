/**
 * Operator bootstrap: grant a role to an existing account (e.g. the first SUPER_ADMIN).
 * Runs server-side with DATABASE_URL; never exposed to the app. Audited.
 * Usage: bun scripts/grant-role.ts someone@example.com SUPER_ADMIN
 */
import { PrismaClient } from "@prisma/client";

const [email, role] = process.argv.slice(2);
const ROLES = ["USER", "OWNER", "AGENT", "PROPERTY_MANAGER", "ADMIN", "SUPER_ADMIN"];
if (!email || !role || !ROLES.includes(role)) { console.error("Usage: bun scripts/grant-role.ts <email> <ROLE>"); process.exit(1); }
const db = new PrismaClient();
const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
if (!user) { console.error("No account with that email."); process.exit(1); }
await db.user.update({ where: { id: user.id }, data: { role: role as never } });
await db.auditLog.create({ data: { actorId: null, action: "role.bootstrap", entityType: "User", entityId: user.id, metadata: { from: user.role, to: role, via: "operator-script" } } });
console.log(`Granted ${role} to ${email}.`);
await db.$disconnect();
