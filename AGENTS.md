<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to Lovable. Avoid rewriting published git history.
<!-- LOVABLE:END -->

## Architecture
- Keep this fresh Phase 1 on TanStack Start file routes, because the project runtime is TanStack Start and replacing it would break the preview.
- Separate typed fictional catalog and pure search filtering from React presentation, so future live data can replace the catalog without rewriting views.
- Keep global navigation in the root route and property presentation in small shared components, so routes remain consistent.
- Never present mock listings as verified, available, or contactable; live integrations belong to later phases.
- Device-local user data lives behind `src/lib/user-data.ts` actions/hooks, so an authenticated API can replace localStorage without touching views.
- Maps go through `src/lib/map-provider.ts`; only a demo provider exists until a real service and browser-safe key are configured.
- Match scores come only from `src/lib/match.ts` using criteria the user set; comparison text from `src/lib/compare.ts` stays neutral, never ranks.
- Owner, agent and analytics demo state live in `src/lib/{owner-data,agent-data,analytics}.ts` via `createLocalStore`, so each can be swapped for an authenticated API without touching views.
- Verification states come only from `src/lib/verification.ts`; UI may request checks (PENDING) but only a backend may set VERIFIED.
- Roles in `src/lib/roles.ts` are a demo view switcher only; real authorization must be server-side.
- Charts render after mount only, because date-based demo series differ between server and browser and break hydration.
- All AI features go through `getAIProvider()` in `src/lib/ai/provider.ts`; only a local rules provider exists, so UI must label it preview, and a real LLM must run server-side returning the same shapes.
- Smart Search output is a `Filters` object fed to the existing `applyFilters`, so there is one search engine.
- The listing assistant (`src/lib/ai/listing-assistant.ts`) may only rephrase owner-entered facts, never add them.
- Saved-search alerts live in `src/lib/alerts.ts` + user-data; nothing is sent until a notification backend exists.
