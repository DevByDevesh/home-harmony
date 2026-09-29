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
