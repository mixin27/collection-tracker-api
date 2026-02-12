# Collection Tracker Backend API Guide (Entire App)

## Base URL

- `https://<your-domain>/api/v1`

## Authentication

- Default: Bearer auth required (`Authorization: Bearer <accessToken>`).
- Public routes are explicitly marked below.

## Main Status Codes

- `200` OK
- `201` Created
- `204` No Content
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `500` Internal Server Error

## Auth

- `POST /auth/register` (Public)
- `POST /auth/login` (Public)
- `POST /auth/google` (Public)
- `POST /auth/refresh` (Public)
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/sessions`
- `DELETE /auth/sessions/:sessionId`
- `GET /auth/me`

## Users

- `GET /users/me`
- `PATCH /users/me`
- `POST /users/me/change-password`

## Sessions

- `GET /sessions`
- `DELETE /sessions/:id`
- `POST /sessions/revoke-others`
- `POST /sessions/admin/cleanup-expired` (Admin)

## Collections

- `POST /collections`
- `GET /collections`
- `GET /collections/stats`
- `GET /collections/search?q=...`
- `GET /collections/:id`
- `PATCH /collections/:id`
- `DELETE /collections/:id`

## Items

- `POST /items`
- `GET /items`
- `GET /items/:id`
- `PATCH /items/:id`
- `DELETE /items/:id`
- `POST /items/sort-order`
- `POST /items/:id/price-history` (legacy-compatible)
- `GET /items/:id/price-history` (legacy-compatible)

## Tags

- `POST /tags`
- `GET /tags`
- `GET /tags/popular`
- `GET /tags/:id`
- `PATCH /tags/:id`
- `DELETE /tags/:id`

## Sync

- `POST /sync/full`
- `POST /sync/incremental`
- `GET /sync/status`

## Loans

- `POST /items/:itemId/loans`
- `GET /items/:itemId/loans`
- `PATCH /loans/:id/return`
- `GET /loans/overdue`

## Price History Module

- `POST /price-history/items/:itemId`
- `GET /price-history/items/:itemId?limit=&offset=`
- `PATCH /price-history/:id`
- `DELETE /price-history/:id`

## Storage

- `POST /storage/presigned-url`
- `DELETE /storage/:key`
- `DELETE /storage?key=...`

## Payments & Subscriptions

- `POST /payments/verify`
- `GET /payments/subscriptions`
- `POST /payments/webhook/:platform` (Public, provider callback)
- `POST /payments/webhook` (Public, provider callback)

Notes:

- Webhooks validate shared secret if configured.
- Google webhooks validate bearer OIDC token.
- Apple webhooks validate signed JWS cert chain.
- Webhook replay protection is enabled via `payment_webhook_events`.

## Suggestions

- `GET /suggestions/collections` (Public)
- `GET /suggestions/tags` (Public)
- `POST /suggestions/collections/track`
- `POST /suggestions/tags/track`

## Analytics

- `POST /analytics/events`
- `GET /analytics/me`
- `GET /analytics/admin/summary` (Admin)

## Admin Config

- `GET /admin/config/entitlements` (Admin)
- `PATCH /admin/config/trial` (Admin)
- `PATCH /admin/config/global-free` (Admin)

## Admin Subscriptions

- `GET /admin/subscriptions` (Admin)
- `PATCH /admin/subscriptions/:id` (Admin)

## Admin Users

- `GET /admin/users` (Admin)
- `GET /admin/users/:id` (Admin)
- `PATCH /admin/users/:id/subscription-tier` (Admin)
- `PATCH /admin/users/:id/limits` (Admin)

## Admin Metrics

- `GET /admin/metrics/overview` (Admin)
- `GET /admin/metrics/cards` (Admin)
- `GET /admin/metrics/overview/export.json` (Admin)

## Admin Audit

- `GET /admin/audit` (Admin)
- `GET /admin/audit/export.csv` (Admin)

## Swagger

- Non-production environments:
  - `GET /api/docs`

## Mobile Integration References

- Payment and subscription guide:
  - `docs/payments-subscriptions-api-guide.md`
- Ready-to-use Flutter service:
  - `docs/flutter-payments-service.md`
