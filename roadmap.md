# HouseProvider.in — fresh Phase 1

## Mapbox integration
- [x] Connect public-token Mapbox map to property discovery with DB coordinates, markers, synchronized selection, and 2D map/satellite modes.
- [x] Verify nine markers, marker/card selection, list/map/satellite, mobile fit, type check and preview build.

## Map batch 2
- [x] Add viewport-aware clusters based on filtered homes and zoom-to-expand interaction.
- [x] Add Mapbox city/locality recentering without passing property data to geocoding.
- [x] Keep public coordinates only and provide an unavailable-by-default commute provider seam.
- [ ] Verify cluster/filter, place search, public privacy, commute copy, type check and preview build.

- [x] Identify the supplied framework and dependencies.
- [x] Plan a fresh Phase 1: plum/peach design system; photographic home; typed fictional catalog and pure filters; home, results, property details; responsive navigation; honest unavailable future actions.
- [x] Replace prior HouseProvider-specific source and imagery without migrating its components, layouts, CSS or mock records.
- [x] Verify search, navigation, detail view, mobile layout, accessibility and preview diagnostics.

Phases 2–6 remain deferred: live maps, accounts, saving, comparison, contact, visits, verification, AI, 3D, dashboards and payments require real integrations. No fabricated scores or verified badges.

## Phase 2 — Discovery & user experience
- [x] Map/list/satellite discovery with demo map provider
- [x] Advanced filters, chips, sheet on mobile
- [x] Saved properties, comparison (max 4), dashboard, visit scheduling (device-local demo)

## Phase 3 — Owner + Agent (demo/local)
- [x] Owner dashboard (overview, listings, enquiries, visits, analytics, verification, profile)
- [x] 9-step listing wizard with validation, autosave, preview, submit → UNDER_REVIEW
- [x] Verification architecture (NOT_REQUESTED/PENDING/VERIFIED/REJECTED/EXPIRED)
- [x] Agent CRM with lead pipeline, lead detail, follow-ups, analytics
- [x] Analytics event seam + reusable charts

## Phase 4 — AI intelligence layer (done)
- [x] Smart Search (natural language → existing filters), editable chips, honest errors
- [x] Match engine with matched/close/unmatched reasons + insufficient-preferences state
- [x] Listing assistant in wizard step 4 (Details), editable, accept/regenerate/reset
- [x] Saved-search alerts (device-local): enable, frequency, types, edit, delete
- [x] AI provider seam (local rules provider only)

## Phase 5 — cinematic 2D experience
- [x] Homepage story sequence: hero, search, featured, match, neighborhoods, demo map, comparison, trust, owner CTA
- [x] Restrained scroll, page, card, gallery, search, map, dashboard, wizard, and CRM transitions
- [x] Reduced motion, mobile simplification, performance-aware transforms
- [x] Regression verification of discovery and demo owner/agent flows

## Phase 6 — Admin, payments, subscriptions, services (demo/local)
- [x] Role-gated /admin with 15 sections, centralized permissions, audit log
- [x] Payment provider seam, config-driven plans, featured placements, services marketplace
- [x] Desktop/tablet/mobile checks and Phase 1–5 regression

## Backend Phase 1 — PostgreSQL + Prisma foundation
- [x] Schema, server-only client, repositories, .env.example, schema validated
- [ ] Initial migration — blocked on a real DATABASE_URL (`bun run db:migrate --name init`)

## Map batch 2
- [x] Filter-aware clusters with zoom-to-expand; individual markers unchanged when zoomed in.
- [x] Place search seam (server-side, query only; never property data).
- [ ] Place search live — blocked: Mapbox connection has only a public (pk.) token; a secret (sk.) token must be added.
- [x] Public coordinates only; commute shows "Not available" via `src/lib/commute.ts` provider seam.

## Phase 0 — Stability + regression baseline (current)
- [x] Inspect routes, shared components, data/auth/storage seams and tests.
- [x] Regression-check homepage → search → results → detail → compare/saved → dashboard/owner/agent/admin, desktop + mobile.
- [x] Confirm the enquiry/message entry still exists; restore only if broken.
- [x] Re-check map clusters, filters, public coordinates, commute copy (place search blocked, see Map batch 2): filters, public coordinates, commute copy.
- [x] Run typecheck/build/lint/tests; add regression tests for any reproduced bug.

## Future phases (planning only)
- Phase 1 — Production backend: finish Prisma migration, real persistence, server data boundaries, auth/session hardening, storage verification.
- Phase 2 — AI foundation: provider abstraction, local rules first, optional free-tier adapter, NL search, explainable recommendations, listing assistant; paid APIs optional.
- Phase 3 — Smart property intelligence: valuation, price/sq.ft., rental yield/ROI, EMI/affordability, transparent deterministic scoring.
- Phase 4 — Advanced discovery: map/draw/radius search, nearby amenities, commute only with verified route data, smarter filters, personalisation.
- Phase 5 — Trust & safety: owner/agent verification, suspicious/duplicate listing and image signals, moderation, badges only when verified.
- Phase 6 — Communication & conversion: real-time chat, enquiry inbox, visit reminders, notifications, saved-search alerts via a real provider.
- Phase 7 — Transaction layer: documents, deal room, payment seams, invoices, subscriptions/services marketplace, audit/security hardening.
- Phase 8 — Production polish & scale: analytics, SEO, performance, accessibility, observability, rate limiting, caching, backups, deployment checks.
