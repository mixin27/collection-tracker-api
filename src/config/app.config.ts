import { registerAs } from '@nestjs/config';

const parseJsonMap = (
  raw: string | undefined,
): Record<string, string> | undefined => {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    return undefined;
  }
};

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT!, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ],

  // Rate limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL!, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT!, 10) || 100,
  },

  // Session management
  maxActiveDevices: parseInt(process.env.MAX_ACTIVE_DEVICES!, 10) || 3,
  sessionCleanupInterval:
    parseInt(process.env.SESSION_CLEANUP_INTERVAL!, 10) || 3600000, // 1 hour

  // Sync configuration
  sync: {
    tombstoneRetentionDays:
      parseInt(process.env.SYNC_TOMBSTONE_RETENTION_DAYS!, 10) || 30,
    maxBatchSize: parseInt(process.env.SYNC_MAX_BATCH_SIZE!, 10) || 1000,
  },

  // Subscription limits
  limits: {
    free: {
      maxCollections: parseInt(process.env.FREE_MAX_COLLECTIONS!, 10) || 2,
      maxItemsPerCollection:
        parseInt(process.env.FREE_MAX_ITEMS_PER_COLLECTION!, 10) || 50,
      maxTags: parseInt(process.env.FREE_MAX_TAGS!, 10) || 10,
      maxDevices: 1,
    },
    premium: {
      maxCollections: parseInt(process.env.PREMIUM_MAX_COLLECTIONS!, 10) || 25,
      maxItemsPerCollection:
        parseInt(process.env.PREMIUM_MAX_ITEMS_PER_COLLECTION!, 10) || 1000,
      maxTags: parseInt(process.env.PREMIUM_MAX_TAGS!, 10) || -1, // -1 = unlimited
      maxDevices: 3,
    },
    ultimate: {
      maxCollections: parseInt(process.env.ULTIMATE_MAX_COLLECTIONS!, 10) || -1, // unlimited
      maxItemsPerCollection:
        parseInt(process.env.ULTIMATE_MAX_ITEMS_PER_COLLECTION!, 10) || -1,
      maxTags: parseInt(process.env.ULTIMATE_MAX_TAGS!, 10) || -1,
      maxDevices: parseInt(process.env.ULTIMATE_MAX_DEVICES!, 10) || 5,
    },
  },

  // Trial settings
  trial: {
    enabled: (process.env.TRIAL_ENABLED || 'true') === 'true',
    days: parseInt(process.env.TRIAL_DAYS || '14', 10),
    tier: process.env.TRIAL_TIER || 'PREMIUM',
  },

  // Global promotional access window
  globalFreeAccess: {
    enabled: (process.env.GLOBAL_FREE_ENABLED || 'false') === 'true',
    tier: process.env.GLOBAL_FREE_TIER || 'PREMIUM',
    startAt: process.env.GLOBAL_FREE_START_AT || null,
    endAt: process.env.GLOBAL_FREE_END_AT || null,
  },

  // Admin controls
  adminEmails: process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((email) => email.trim())
    : [],

  payments: {
    google: {
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME,
      serviceAccountEmail: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PLAY_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      webhookSecret: process.env.GOOGLE_WEBHOOK_SECRET,
    },
    apple: {
      bundleId: process.env.APPLE_BUNDLE_ID,
      issuerId: process.env.APPLE_ISSUER_ID,
      keyId: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      appAppleId: process.env.APPLE_APP_ID,
      webhookSecret: process.env.APPLE_WEBHOOK_SECRET,
      useSandboxApi: (process.env.APPLE_USE_SANDBOX_API || 'false') === 'true',
    },
    productTierMap: parseJsonMap(process.env.SUBSCRIPTION_PRODUCT_TIER_MAP) || {
      premium_monthly: 'PREMIUM',
      premium_yearly: 'PREMIUM',
      ultimate_monthly: 'ULTIMATE',
      ultimate_yearly: 'ULTIMATE',
    },
  },
}));
