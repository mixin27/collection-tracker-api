# Payments & Subscriptions API Guide (Flutter Mobile)

## Base URL

- `https://<your-domain>/api/v1`

## Auth

- Protected endpoints require:
  - `Authorization: Bearer <accessToken>`

## Endpoints

### 1) Verify in-app purchase

- **POST** `/payments/verify`
- Use immediately after `in_app_purchase` reports a completed purchase.

#### Request body (Google Play)

```json
{
  "platform": "GOOGLE_PLAY",
  "productId": "premium_monthly",
  "purchaseToken": "google_purchase_token_here"
}
```

#### Request body (App Store)

```json
{
  "platform": "APPLE_STORE",
  "productId": "premium_monthly",
  "transactionId": "2000001234567890"
}
```

#### Success response

```json
{
  "verified": true,
  "subscription": {
    "id": "sub-id",
    "userId": "user-id",
    "platform": "GOOGLE_PLAY",
    "productId": "premium_monthly",
    "purchaseToken": "token",
    "orderId": "GPA...",
    "status": "ACTIVE",
    "tier": "PREMIUM",
    "purchaseDate": "2026-02-12T12:00:00.000Z",
    "expiryDate": "2026-03-12T12:00:00.000Z",
    "autoRenewing": true,
    "lastVerifiedAt": "2026-02-12T12:00:01.000Z"
  }
}
```

### 2) Get user subscriptions

- **GET** `/payments/subscriptions`
- Use on app startup/profile refresh to sync current subscription state.

#### Success response

```json
{
  "subscriptions": [
    {
      "id": "sub-id",
      "platform": "GOOGLE_PLAY",
      "productId": "premium_monthly",
      "status": "ACTIVE",
      "tier": "PREMIUM",
      "expiryDate": "2026-03-12T12:00:00.000Z",
      "autoRenewing": true
    }
  ]
}
```

### 3) Get effective user profile/entitlement

- **GET** `/auth/me`
- Use for feature gating from backend truth.
- `user.subscriptionTier` reflects effective tier logic server-side.

## Subscription status values to handle

- `ACTIVE`
- `GRACE_PERIOD`
- `ON_HOLD`
- `PAUSED`
- `EXPIRED`
- `CANCELLED`

## Recommended mobile flow

1. Start purchase with `in_app_purchase`.
2. When purchase succeeds, call `POST /payments/verify`.
3. Refresh app user state using `GET /auth/me` and/or `GET /payments/subscriptions`.
4. Unlock premium UI only after server verification.

## Error handling

- `400`: invalid payload / missing token or transactionId
- `401`: invalid/expired access token
- `403`: forbidden
- `500`: temporary provider/backend issue

## Notes

- For restore purchases, re-verify each restored item with `POST /payments/verify`.
- Keep product IDs in Flutter exactly matching backend mapping.
