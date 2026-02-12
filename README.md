# Collection Tracker API

Production-focused NestJS backend for the Collection Tracker app with authentication, sync, subscriptions, admin tooling, analytics, and deployment via Docker.

## Tech Stack

- NestJS 11
- Prisma 7
- PostgreSQL
- JWT auth + Google login
- AWS S3 signed upload support
- Google Play + App Store subscription verification

## Implemented Modules

- Auth (`/auth`)
- Users (`/users`)
- Sessions (`/sessions`)
- Collections (`/collections`)
- Items (`/items`)
- Tags (`/tags`)
- Sync (`/sync`)
- Loans (`/items/:itemId/loans`, `/loans/*`)
- Price History (`/price-history` and legacy `/items/:id/price-history`)
- Storage (`/storage`)
- Payments (`/payments`)
- Suggestions (`/suggestions`)
- Analytics (`/analytics`)
- Admin (`/admin/*`)

## Project Structure

```text
src/
  admin/
  analytics/
  auth/
  collection/
  common/
  config/
  items/
  loans/
  payments/
  price-history/
  prisma/
  sessions/
  storage/
  subscription/
  suggestions/
  sync/
  tags/
  users/
```

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 16+

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run start:dev
```

API base (local): `http://localhost:4000/api/v1`

Swagger (non-production): `http://localhost:4000/api/docs`

## Docker Deployment

```bash
cp .env.example .env
# Ensure DATABASE_URL uses docker service host:
# DATABASE_URL="postgresql://postgres:postgres@db:5432/collection_tracker?schema=public"

docker compose up -d --build
```

The app container runs Prisma migrations on startup before launching the API.

Stop stack:

```bash
docker compose down
```

Remove DB volume:

```bash
docker compose down -v
```

## Environment Variables

See `.env.example` for all variables.

Key groups:

- App: `NODE_ENV`, `PORT`, `API_PREFIX`, `CORS_ORIGINS`
- DB: `DATABASE_URL`, `POSTGRES_*`
- JWT: `JWT_*`
- Google OAuth / Play Billing
- Apple subscription verification
- AWS S3
- Limits / trial / global free period
- Admin access (`ADMIN_EMAILS`)

## API Documentation Files

- Entire API guide:
  - `docs/api-guide-entire-app.md`
- Payment & subscription guide:
  - `docs/payments-subscriptions-api-guide.md`
- Flutter payment service integration:
  - `docs/flutter-payments-service.md`
- Backend roadmap / enhancements:
  - `docs/todo-enhancements-entire-app.md`

## Core Commands

```bash
# Build
pnpm run build

# Production start (after build)
pnpm run start:prod

# Tests
pnpm run test
pnpm run test:e2e

# Prisma
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:migrate:prod
pnpm run prisma:studio
```

## Admin Capabilities (Current)

- Entitlements config (`trial`, `global free`)
- Subscription management
- User management + limits override
- Metrics overview/cards/export
- Audit logs + CSV export

## Notes

- Webhook replay protection is enabled for payment webhooks.
- Session records capture `ipAddress` and `userAgent` on auth success.
- Keep store product IDs aligned with `SUBSCRIPTION_PRODUCT_TIER_MAP`.

## License

MIT
