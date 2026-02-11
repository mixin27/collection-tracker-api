import { registerAs } from '@nestjs/config';

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
}));
