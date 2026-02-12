# TODO & Enhancement Roadmap (Entire App)

## P0 (High Priority)

- Add integration/E2E test suite for critical flows:
  - Auth lifecycle (register/login/refresh/logout)
  - Payment verify + webhook processing (Google/Apple)
  - Admin protected routes authorization checks
- Add database migration rollout checks in CI:
  - fail build when pending migrations exist
- Add observability baseline:
  - request ID tracing
  - structured logs
  - webhook error metrics/alerts
- Add webhook dead-letter and retry strategy for failed payment webhooks.

## P1 (Short-term)

- Introduce dedicated role model in database (`USER`, `ADMIN`) instead of `ADMIN_EMAILS` only.
- Add refresh token/session anomaly detection:
  - suspicious IP/user-agent changes
  - optional forced re-auth
- Add retention jobs:
  - purge/archive old `payment_webhook_events`
  - archive old `user_activities`
- Add CSV/JSON exports for more admin resources:
  - users export
  - subscriptions export
- Add endpoint versioning policy and deprecation headers for legacy routes.

## P2 (Product/Scale)

- Add tenant-safe feature flags in DB for staged rollouts.
- Add rate limiting tiers by user subscription tier.
- Add caching layer for expensive analytics/metrics endpoints.
- Add read replicas/query optimization for dashboard-heavy queries.

## Payments & Subscription Improvements

- Add full App Store event mapping matrix:
  - refund/revoke/billing retry edge states
- Add periodic reconciliation status dashboard:
  - last run, failures, affected users
- Add subscription dispute and manual override history screen support.
- Add explicit idempotency key support for client-side verify endpoint.

## Security Enhancements

- Add IP extraction hardening behind reverse proxies (`X-Forwarded-For` trust model).
- Add stricter payload validation schemas for webhooks.
- Add secrets rotation playbook and key versioning support.
- Add security audit log immutability controls (append-only strategy).

## Developer Experience

- Add OpenAPI export artifact in CI and publish to docs.
- Add Postman/Insomnia collections generated from OpenAPI.
- Add per-module README files under `src/<module>/README.md`.
- Add seed scripts for local demo data across modules.

## Data Model / Domain Enhancements

- Add explicit relation from `UserActivity` to `User` in Prisma schema for easier joins.
- Add materialized daily metrics tables for long-range dashboard queries.
- Add soft-delete for more entities where auditability matters.

## Mobile Integration Enhancements

- Provide typed API SDK for Flutter generated from OpenAPI.
- Add endpoint for unified entitlement snapshot optimized for app startup.
- Add offline sync conflict telemetry endpoint for client diagnostics.

## Operational Readiness Checklist

- Add backup/restore runbook and periodic restore tests.
- Add environment parity checklist (dev/staging/prod settings drift checks).
- Add SLOs for auth latency, payment verification latency, webhook processing latency.
- Add incident response playbook for payment provider outages.
