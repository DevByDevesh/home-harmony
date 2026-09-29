<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to Lovable. Avoid rewriting published git history.
<!-- LOVABLE:END -->

## Architecture
- Keep this fresh Phase 1 on TanStack Start file routes, because the project runtime is TanStack Start and replacing it would break the preview.
- Separate typed fictional catalog and pure search filtering from React presentation, so future live data can replace the catalog without rewriting views.
- Keep global navigation in the root route and property presentation in small shared components, so routes remain consistent.
- Never present mock listings as verified, available, or contactable; live integrations belong to later phases.
