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
