-- Final RBAC hierarchy: OWNER > ADMIN > moderation/users.
-- Preserve existing data before removing the obsolete SUPER_ADMIN enum value.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'OWNER') THEN
    UPDATE "User" SET "role" = 'OWNER' WHERE "role" = 'SUPER_ADMIN';
  ELSE
    UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'SUPER_ADMIN';
  END IF;
END $$;

ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('USER', 'OWNER', 'AGENT', 'PROPERTY_MANAGER', 'ADMIN');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::text::"Role");

DROP TYPE "Role_old";
