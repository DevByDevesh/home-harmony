<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project architecture
- Keep Phase 1 listing data in a typed client-safe catalog and filtering in a pure utility so live API data can replace mock records without rewriting views.
- Use TanStack Start file routes for home, results, and property detail because this project already runs on TanStack Start rather than Next.js.
- Keep shared navigation in the root layout and reusable property UI in components so every content route remains consistent.
