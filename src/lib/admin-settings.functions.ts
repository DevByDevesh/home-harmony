import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function db() {
  const { requireDb } = await import("./db/client.server");
  return requireDb();
}

async function guardSettingsEdit() {
  const { requirePermission } = await import("./auth/guards.server");
  return requirePermission("settings.edit");
}

export const getMaintenanceModeFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const row = await (await db()).platformSetting.findUnique({ where: { key: "maintenanceMode" } });
    return row?.value === "true";
  } catch {
    return false;
  }
});

export const setMaintenanceModeFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ enabled: z.boolean() }).strict().parse(d))
  .handler(async ({ data }) => {
    const user = await guardSettingsEdit();
    const database = await db();
    await database.platformSetting.upsert({
      where: { key: "maintenanceMode" },
      create: { key: "maintenanceMode", value: String(data.enabled) },
      update: { value: String(data.enabled) },
    });
    const { writeAudit } = await import("./auth/audit.server");
    await writeAudit({
      actorId: user.id,
      action: data.enabled ? "admin.settings.maintenance_on" : "admin.settings.maintenance_off",
      entityType: "PlatformSetting",
      entityId: "maintenanceMode",
      metadata: { enabled: String(data.enabled) },
    });
    return { ok: true as const, enabled: data.enabled };
  });
