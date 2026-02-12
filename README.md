# Collection Tracker Backend API

A production-ready NestJS backend for an offline-first mobile collection tracking application with cloud sync, JWT authentication, Google OAuth, subscription management, and AWS S3 storage.

## 🚀 Features

- ✅ **Authentication & Authorization**
  - JWT-based auth with refresh tokens
  - Google OAuth 2.0 (web + mobile native flows)
  - Multi-device session management
  - Device-bound tokens

- ✅ **Cloud Sync System**
  - Offline-first delta sync
  - Last-Write-Wins conflict resolution
  - Soft deletes with tombstones
  - Batch operations

- ✅ **Subscription Management**
  - Google Play Billing integration
  - Real-Time Developer Notifications (RTDN)
  - Three tiers: FREE, PREMIUM, ULTIMATE
  - Automatic limit enforcement

- ✅ **File Storage**
  - AWS S3 integration
  - Pre-signed URL uploads
  - Organized bucket structure

- ✅ **Extended Features**
  - Price tracking
  - Loan management
  - Smart suggestions
  - Analytics tracking

## 📋 Prerequisites

- Node.js >= 20.x
- PostgreSQL >= 16.x
- pnpm or npm or yarn
- AWS Account (for S3)
- Google Cloud Project (for OAuth & Play Billing)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm run prisma:generate
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/collection_tracker"

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-secure-secret-here
JWT_REFRESH_SECRET=your-secure-refresh-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Google Play Billing
GOOGLE_PLAY_PACKAGE_NAME=com.yourapp.collectiontracker
GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### 3. Database Setup

```bash
# Run migrations
pnpm run prisma:migrate

# (Optional) Seed database
pnpm run prisma:seed

# Open Prisma Studio to view data
pnpm run prisma:studio
```

### 4. AWS S3 Setup

1. Create an S3 bucket
2. Configure CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

3. Set bucket policy for public read (optional)
4. Add credentials to `.env`

### 5. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:4000/api/v1/auth/google/callback` (development)
   - `https://your-domain.com/api/v1/auth/google/callback` (production)
4. Download credentials and add to `.env`

### 6. Google Play Billing Setup

1. Enable Google Play Developer API
2. Create Service Account
3. Grant permissions in Play Console
4. Download JSON key
5. Add credentials to `.env`

## 🚀 Running the Application

```bash
# Development
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod

# Debug mode
pnpm run start:debug
```

The API will be available at `http://localhost:4000/api/v1`

## 📚 API Documentation

Once running, visit `http://localhost:4000/api/docs` for Swagger documentation.

## 🔑 Authentication Flow

### Local Registration/Login

```bash
# Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "deviceId": "uuid-device-id",
  "deviceName": "iPhone 14 Pro",
  "deviceOs": "iOS 17.1"
}

# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceId": "uuid-device-id",
  "deviceName": "iPhone 14 Pro",
  "deviceOs": "iOS 17.1"
}

# Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... },
  "session": { ... }
}
```

### Google OAuth (Mobile Native)

```bash
POST /api/v1/auth/google
{
  "idToken": "google-id-token-from-mobile-sdk",
  "deviceId": "uuid-device-id",
  "deviceName": "Samsung Galaxy S23",
  "deviceOs": "Android 14"
}
```

### Token Refresh

```bash
POST /api/v1/auth/refresh
{
  "refreshToken": "current-refresh-token",
  "deviceId": "uuid-device-id"
}
```

## 🔄 Sync Flow

### Initial Full Sync

```bash
POST /api/v1/sync/full
Authorization: Bearer {accessToken}
{
  "deviceId": "uuid-device-id",
  "lastSyncAt": null
}
```

### Incremental Sync

```bash
POST /api/v1/sync/incremental
Authorization: Bearer {accessToken}
{
  "deviceId": "uuid-device-id",
  "lastSyncAt": "2025-02-01T12:00:00.000Z",
  "changes": {
    "collections": [
      {
        "id": "collection-uuid",
        "name": "Books",
        "type": "book",
        "version": 2,
        "updatedAt": "2025-02-01T12:30:00.000Z",
        "isDeleted": false
      }
    ],
    "items": [],
    "tags": []
  }
}
```

## 💳 Subscription Tiers

| Feature              | FREE | PREMIUM   | ULTIMATE  |
| -------------------- | ---- | --------- | --------- |
| Collections          | 2    | 25        | Unlimited |
| Items per Collection | 50   | 1,000     | Unlimited |
| Tags                 | 10   | Unlimited | Unlimited |
| Cloud Backup         | ❌   | ✅        | ✅        |
| Devices              | 1    | 3         | 5         |
| Price Tracking       | ❌   | ✅        | ✅        |
| Loan Tracking        | ❌   | ✅        | ✅        |
| Analytics            | ❌   | ✅        | ✅        |
| **Price**            | Free | $4.99/mo  | $9.99/mo  |

## 🏗️ Project Structure

```
src/
├── auth/                  # Authentication & authorization
├── users/                 # User management
├── sessions/              # Device session management
├── sync/                  # Cloud sync orchestration
├── collections/           # Collection CRUD
├── items/                 # Item CRUD
├── tags/                  # Tag CRUD
├── payments/              # Subscription & billing
├── storage/               # AWS S3 file management
├── loans/                 # Loan tracking
├── price-history/         # Price tracking
├── suggestions/           # AI suggestions
├── analytics/             # Usage analytics
├── common/                # Shared utilities
├── config/                # Configuration
├── prisma/                # Database client
├── app.module.ts          # Root module
└── main.ts                # Application entry point
```

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## 📊 Database Schema

Key tables:

- `users` - User accounts
- `accounts` - OAuth provider links
- `device_sessions` - Active device sessions
- `collections` - User collections
- `items` - Collection items
- `tags` - Item tags
- `subscriptions` - Payment subscriptions
- `sync_logs` - Sync history
- `price_history` - Price tracking
- `loans` - Loan records

See `prisma/schema.prisma` for complete schema.

## 🔐 Security

- Bcrypt password hashing (cost: 12)
- JWT with RS256 algorithm
- Refresh token rotation
- Rate limiting (100 req/min)
- CORS protection
- Helmet security headers
- SQL injection protection (Prisma)
- XSS protection

## 📈 Performance

- Database connection pooling
- Indexed queries
- Batch sync operations
- Response compression
- Caching strategies
- Pagination for large datasets

## 🐛 Debugging

```bash
# View logs
pnpm run start:dev

# Database queries
pnpm run prisma:studio

# Debug mode
pnpm run start:debug
```

## 🚀 Deployment

### Docker (Recommended)

```dockerfile
# Coming soon
```

### Manual Deployment

1. Build application: `pnpm run build`
2. Set environment variables
3. Run migrations: `pnpm run prisma:migrate:prod`
4. Start: `pnpm run start:prod`

### Environment Checklist

- [ ] Change all secrets
- [ ] Configure production database
- [ ] Set up SSL/HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure backups
- [ ] Set up CI/CD pipeline
- [ ] Enable rate limiting
- [ ] Configure logging service
- [ ] Set up alerts

## 📝 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/google` - Google OAuth (mobile)
- `GET /auth/google/callback` - Google OAuth (web)
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout current device
- `POST /auth/logout-all` - Logout all devices
- `GET /auth/sessions` - List active sessions
- `DELETE /auth/sessions/:id` - Remove session

### Sync

- `POST /sync/full` - Full sync
- `POST /sync/incremental` - Delta sync
- `GET /sync/status` - Sync status

### Collections

- `GET /collections` - List collections
- `POST /collections` - Create collection
- `GET /collections/:id` - Get collection
- `PATCH /collections/:id` - Update collection
- `DELETE /collections/:id` - Delete collection

### Items

- `GET /items` - List items
- `POST /items` - Create item
- `GET /items/:id` - Get item
- `PATCH /items/:id` - Update item
- `DELETE /items/:id` - Delete item

### Tags

- `GET /tags` - List tags
- `POST /tags` - Create tag
- `GET /tags/:id` - Get tag
- `PATCH /tags/:id` - Update tag
- `DELETE /tags/:id` - Delete tag

### Payments

- `POST /payments/verify` - Verify purchase
- `GET /payments/subscriptions` - Get subscriptions
- `POST /payments/webhook` - Google Play webhook

### Storage

- `POST /storage/presigned-url` - Get upload URL
- `DELETE /storage/:key` - Delete file

### Price History

- `POST /items/:id/price-history` - Add price
- `GET /items/:id/price-history` - Get history

### Loans

- `POST /items/:id/loans` - Create loan
- `GET /items/:id/loans` - Get loans
- `PATCH /loans/:id/return` - Mark returned
- `GET /loans/overdue` - Get overdue

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT
