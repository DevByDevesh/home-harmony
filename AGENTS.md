<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to Lovable. Avoid rewriting published git history.
<!-- LOVABLE:END -->

## Architecture
- Keep TanStack Start file routes; changing runtime breaks preview.
- Keep typed fictional catalog and pure filters apart from React, for future live data replacement.
- Keep global nav in root and property presentation shared across routes.
- Never present mock listings as verified, available, or contactable; live integrations belong to later phases.
- Keep device-local user data behind `src/lib/user-data.ts` for future API replacement.
- Maps use `src/lib/map-provider.ts`; demo only until a real provider is connected.
- Match scores come only from `src/lib/match.ts` using criteria the user set; comparison text from `src/lib/compare.ts` stays neutral, never ranks.
- Owner, agent and analytics demo state use `createLocalStore` for future API replacement.
- Verification states come only from `src/lib/verification.ts`; UI may request checks (PENDING) but only a backend may set VERIFIED.
- Roles in `src/lib/roles.ts` are a demo view switcher only; real authorization must be server-side.
- Charts render after mount only, because date-based demo series differ between server and browser and break hydration.
- All AI features go through `getAIProvider()` in `src/lib/ai/provider.ts`; only a local rules provider exists, so UI must label it preview, and a real LLM must run server-side returning the same shapes.
- Smart Search output is a `Filters` object fed to the existing `applyFilters`, so there is one search engine.
- The listing assistant (`src/lib/ai/listing-assistant.ts`) may only rephrase owner-entered facts, never add them.
- Saved-search alerts use `src/lib/alerts.ts` + user-data; nothing is sent yet.
- Keep the product 2D-only, with no Three.js, R3F or WebGL; Phase 5 replaced the earlier 3D direction.
- Keep motion shared, once-only and reduced-motion aware; off-screen animation stays idle.
- Admin data lives behind `src/lib/admin/repository.ts` (device-local seed) and permissions only via `can()` in `src/lib/admin/permissions.ts`; both are UX seams — real auth and persistence must be server-side.
- Payments go through `getPaymentProvider()` in `src/lib/payments/provider.ts`; gateway SDKs and secrets must run server-side only.
- Plans, settings and notification rules come from `src/lib/admin/config.ts`, never hard-coded in UI.
- Database is PostgreSQL via Prisma (`prisma/schema.prisma`); client only from `src/lib/db/client.server.ts` (pg adapter, returns null without `DATABASE_URL`), so the demo keeps working and Prisma never reaches the browser.
- UI never calls Prisma; DB access goes through `src/lib/db/repositories/*.server.ts`, which are not wired into the UI until a later backend phase.
- First Super admin only via POST `/api/public/bootstrap-super-admin` (secret header, existing active account, one-time lock in AuditLog, 5 fails/hour lockout); no scripts or UI may grant SUPER_ADMIN otherwise, so privilege never bypasses the audited path.
