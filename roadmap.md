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
