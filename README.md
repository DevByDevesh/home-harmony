# HouseProvider.in

HouseProvider.in is a full-stack real-estate discovery platform built with TanStack Start, React, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Development

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```sh
git clone https://github.com/DevByDevesh/home-harmony.git
cd home-harmony
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Database (PostgreSQL + Prisma)

**Staging/production requirement:** `DATABASE_URL` must be configured on the server. The demo fallback is intended only for local development; staging and production should be treated as database-backed environments.

Copy `.env.example` to your local environment and configure `DATABASE_URL` as a server-side secret (never `VITE_`-prefixed).

Development:

```sh
npm run db:validate
npm run db:migrate
```

Production:

```sh
npm run db:validate
npm run db:deploy
```

Without `DATABASE_URL`, the app can use its device-local/demo fallback data where supported.

## Environment

See `.env.example` for the required authentication, database, OAuth, storage, and trusted-origin settings.

## Architecture

- TanStack Start + TanStack Router for SSR and routing
- React 19 + TypeScript
- Tailwind CSS v4
- Nitro for production server output
- Prisma + PostgreSQL for persistent data
- Better Auth for authentication and sessions
- Mapbox for map rendering


### Listing moderation
Admin listing approval is separate from verification. Listings start under review and can be approved or rejected from Admin → Properties. Rejection reasons are configurable with the server-only `LISTING_REJECTION_REASON_REQUIRED` setting (defaults to required). Rejection reasons are stored with the moderation record and sent to the owner in the in-app notification.

### Listing expiry scheduler
Staging/production should configure `LISTING_EXPIRY_CRON_SECRET` and call `POST /api/public/expire-listings` from the hosting scheduler at least daily. The job:
- marks active listings older than 30 days from `publishedAt` as `EXPIRED`;
- keeps expired listings available to the owner for a 7-day repost window;
- permanently removes expired listings after that 7-day window, including listing-specific images, saves, comparisons, visits, enquiries, reviews, and verification records;
- preserves report/service references by detaching the deleted property and writes an audit record for the permanent deletion.

Reposting changes the expired listing back to `UNDER_REVIEW`, so it leaves the purge set and starts a fresh 30-day validity period only after it is published again. Public reads also run the 30-day expiry sweep as a safety net.
