<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to Lovable. Avoid rewriting published git history.
<!-- LOVABLE:END -->

## Architecture
- Keep TanStack Start file routes, root nav, shared property presentation, typed fictional catalog, and pure filters; this preserves preview and data interchangeability.
- Keep device-local data behind `user-data.ts` and demo state behind `createLocalStore`; these are future API seams.
- Maps use browser-only Mapbox GL JS with public coordinates/token and filter-aware clusters; only user place queries reach server-side geocoding, never private addresses, to protect owners.
- Keep 2D-only; Mapbox is the sole WebGL exception, without terrain, buildings, Three.js or R3F.
- Match scores use `match.ts`; neutral comparisons use `compare.ts`; only set criteria contribute. Commute needs verified provider data or shows Not available.
- Verification states use `verification.ts`; only a backend can mark VERIFIED. Demo roles are view-only; real access is server-enforced.
- Render date-based charts after mount to avoid hydration drift; motion is once-only, reduced-motion-aware, and idle off screen.
- AI uses `getAIProvider()`; local rules are preview-only, Smart Search returns Filters for `applyFilters`, and listing text may only rephrase entered facts.
- Saved-search alerts use `alerts.ts` and user data; never claim delivery without a real sender.
- Admin demo data uses `admin/repository.ts` and `can()` permissions; server-side checks protect live actions.
- Payments use `getPaymentProvider()` with server-only gateway secrets; plans and service rules come from `admin/config.ts`.
- Prisma lives in server-only `db/client.server.ts`; UI calls repositories/functions, never Prisma directly, to protect credentials.
- First Super admin uses only audited POST `/api/public/bootstrap-super-admin`; never bypass the one-time lock.
- Seed config idempotently via `prisma/seed-config.sql`; never overwrite admin edits.
- Owner photos use server-only `storage/property-images.server.ts` after a DB ownership check; Better Auth is separate from storage auth.
