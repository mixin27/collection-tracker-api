import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import {
  UpdateGlobalFreeConfigDto,
  UpdateTrialConfigDto,
} from './dto/admin-entitlements.dto';
import {
  AdminListSubscriptionsQueryDto,
  AdminUpdateSubscriptionDto,
} from './dto/admin-subscriptions.dto';
import { SubscriptionProfileService } from '@/subscription/subscription-profile.service';
import { SubscriptionStatus } from '@/generated/prisma/client';
import { AdminMetricsQueryDto } from './dto/admin-metrics.dto';
import {
  AdminListUsersQueryDto,
  AdminUpdateUserLimitsDto,
  AdminUpdateUserTierDto,
} from './dto/admin-users.dto';
import { SubscriptionTier } from '@/generated/prisma/enums';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly subscriptionProfileService: SubscriptionProfileService,
  ) {}

  async getEntitlementsConfig() {
    const [trialConfig, globalFreeConfig] = await Promise.all([
      this.getJsonSystemConfig('trial_config'),
      this.getJsonSystemConfig('global_free_access'),
    ]);

    const envTrial = {
      enabled: this.configService.get<boolean>('app.trial.enabled') ?? true,
      days: this.configService.get<number>('app.trial.days') ?? 14,
      tier: this.configService.get<string>('app.trial.tier') ?? 'PREMIUM',
    };

    const envGlobalFree = {
      enabled:
        this.configService.get<boolean>('app.globalFreeAccess.enabled') ?? false,
      tier:
        this.configService.get<string>('app.globalFreeAccess.tier') || 'PREMIUM',
      startAt: this.configService.get<string | null>('app.globalFreeAccess.startAt'),
      endAt: this.configService.get<string | null>('app.globalFreeAccess.endAt'),
    };

    return {
      trial: {
        effective: {
          enabled: trialConfig?.enabled ?? envTrial.enabled,
          days: Number(trialConfig?.days ?? envTrial.days),
          tier: String(trialConfig?.tier ?? envTrial.tier),
        },
        envDefault: envTrial,
        dbOverride: trialConfig,
      },
      globalFreeAccess: {
        effective: {
          enabled: globalFreeConfig?.enabled ?? envGlobalFree.enabled,
          tier: String(globalFreeConfig?.tier ?? envGlobalFree.tier),
          startAt:
            (globalFreeConfig?.startAt as string | null | undefined) ??
            envGlobalFree.startAt,
          endAt:
            (globalFreeConfig?.endAt as string | null | undefined) ??
            envGlobalFree.endAt,
        },
        envDefault: envGlobalFree,
        dbOverride: globalFreeConfig,
      },
    };
  }

  async updateTrialConfig(adminUserId: string, dto: UpdateTrialConfigDto) {
    const value = JSON.stringify({
      enabled: dto.enabled,
      days: dto.days,
      tier: dto.tier,
    });

    await this.prisma.systemConfig.upsert({
      where: { key: 'trial_config' },
      update: { value },
      create: { key: 'trial_config', value },
    });

    await this.logAdminChange(adminUserId, 'admin_trial_config_updated', {
      trialConfig: dto,
    });

    return this.getEntitlementsConfig();
  }

  async updateGlobalFreeConfig(
    adminUserId: string,
    dto: UpdateGlobalFreeConfigDto,
  ) {
    const value = JSON.stringify({
      enabled: dto.enabled,
      tier: dto.tier,
      startAt: dto.startAt ?? null,
      endAt: dto.endAt ?? null,
    });

    await this.prisma.systemConfig.upsert({
      where: { key: 'global_free_access' },
      update: { value },
      create: { key: 'global_free_access', value },
    });

    await this.logAdminChange(adminUserId, 'admin_global_free_updated', {
      globalFreeAccess: dto,
    });

    return this.getEntitlementsConfig();
  }

  async listSubscriptions(query: AdminListSubscriptionsQueryDto) {
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    if (query.platform) where.platform = query.platform;

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      total,
      limit,
      offset,
      hasMore: offset + subscriptions.length < total,
    };
  }

  async updateSubscription(
    adminUserId: string,
    subscriptionId: string,
    dto: AdminUpdateSubscriptionDto,
  ) {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, userId: true },
    });
    if (!existing) {
      return { updated: false, reason: 'not_found' };
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: dto.status,
        tier: dto.tier,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        autoRenewing: dto.autoRenewing,
        productId: dto.productId,
        lastVerifiedAt: new Date(),
      },
    });

    await this.subscriptionProfileService.syncUserSubscriptionProfile(
      existing.userId,
    );

    await this.logAdminChange(adminUserId, 'admin_subscription_updated', {
      subscriptionId,
      changes: dto,
    });

    return {
      updated: true,
      subscription: updated,
    };
  }

  async getDashboardOverview(query: AdminMetricsQueryDto) {
    const now = new Date();
    const days = query.days ?? 7;
    const top = query.top ?? 10;

    const from = query.from
      ? new Date(query.from)
      : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : now;
    const inRange = { gte: from, lte: to };
    const activeStatuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD];

    const [
      totalUsers,
      newUsersInRange,
      activeSubscriberUsers,
      subscriptionByTier,
      subscriptionByPlatform,
      expiringIn7Days,
      revenueByCurrencyRaw,
      totalEvents,
      uniqueActivityUsers,
      topActionsRaw,
      dailyRaw,
      webhookVolume24h,
      entitlementsConfig,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: inRange },
      }),
      this.prisma.subscription.findMany({
        where: {
          status: { in: activeStatuses },
          expiryDate: { gt: now },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.subscription.groupBy({
        by: ['tier'],
        where: {
          status: { in: activeStatuses },
          expiryDate: { gt: now },
        },
        _count: { tier: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['platform'],
        where: {
          status: { in: activeStatuses },
          expiryDate: { gt: now },
        },
        _count: { platform: true },
      }),
      this.prisma.subscription.count({
        where: {
          status: { in: activeStatuses },
          expiryDate: {
            gt: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.subscription.groupBy({
        by: ['priceCurrencyCode'],
        where: {
          status: { in: activeStatuses },
          expiryDate: { gt: now },
          priceAmountMicros: { not: null },
          priceCurrencyCode: { not: null },
        },
        _sum: {
          priceAmountMicros: true,
        },
      }),
      this.prisma.userActivity.count({
        where: { timestamp: inRange },
      }),
      this.prisma.userActivity.findMany({
        where: {
          timestamp: inRange,
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.userActivity.groupBy({
        by: ['action'],
        where: { timestamp: inRange },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: top,
      }),
      this.prisma.$queryRaw<
        Array<{ day: Date; count: bigint | number | string }>
      >`SELECT date_trunc('day', "timestamp") AS day, COUNT(*)::bigint AS count
        FROM "user_activities"
        WHERE "timestamp" >= ${from} AND "timestamp" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC`,
      this.prisma.paymentWebhookEvent.groupBy({
        by: ['platform'],
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
        _count: { platform: true },
      }),
      this.getEntitlementsConfig(),
    ]);

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      users: {
        total: totalUsers,
        newInRange: newUsersInRange,
      },
      subscriptions: {
        activeSubscribers: activeSubscriberUsers.length,
        expiringIn7Days,
        byTier: subscriptionByTier.map((x) => ({
          tier: x.tier,
          count: x._count.tier,
        })),
        byPlatform: subscriptionByPlatform.map((x) => ({
          platform: x.platform,
          count: x._count.platform,
        })),
        revenueProxyMonthlyByCurrency: revenueByCurrencyRaw.map((x) => ({
          currency: x.priceCurrencyCode,
          totalMicros: x._sum.priceAmountMicros
            ? Number(x._sum.priceAmountMicros)
            : 0,
        })),
      },
      activity: {
        totalEvents,
        uniqueUsers: uniqueActivityUsers.length,
        topActions: topActionsRaw.map((x) => ({
          action: x.action,
          count: x._count.action,
        })),
        daily: dailyRaw.map((row) => ({
          day: new Date(row.day).toISOString(),
          count: Number(row.count),
        })),
      },
      webhooks: {
        last24HoursByPlatform: webhookVolume24h.map((x) => ({
          platform: x.platform,
          count: x._count.platform,
        })),
      },
      entitlements: entitlementsConfig,
    };
  }

  async getDashboardCards(query: AdminMetricsQueryDto) {
    const now = new Date();
    const days = query.days ?? 7;
    const from = query.from
      ? new Date(query.from)
      : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : now;
    const inRange = { gte: from, lte: to };

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const activeStatuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD];

    const [
      totalUsers,
      newUsersRange,
      newUsersToday,
      newUsersYesterday,
      activeSubscribers,
      expiringSoon,
      activityRange,
      activityToday,
      activityYesterday,
      webhook24h,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: inRange } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday, lte: now } } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfYesterday, lt: startOfToday } },
      }),
      this.prisma.subscription.findMany({
        where: {
          status: { in: activeStatuses },
          expiryDate: { gt: now },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.subscription.count({
        where: {
          status: { in: activeStatuses },
          expiryDate: {
            gt: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.userActivity.count({ where: { timestamp: inRange } }),
      this.prisma.userActivity.count({
        where: { timestamp: { gte: startOfToday, lte: now } },
      }),
      this.prisma.userActivity.count({
        where: { timestamp: { gte: startOfYesterday, lt: startOfToday } },
      }),
      this.prisma.paymentWebhookEvent.count({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const dailyUserDelta =
      newUsersYesterday === 0
        ? (newUsersToday > 0 ? 100 : 0)
        : ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100;
    const dailyActivityDelta =
      activityYesterday === 0
        ? (activityToday > 0 ? 100 : 0)
        : ((activityToday - activityYesterday) / activityYesterday) * 100;

    return {
      range: { from: from.toISOString(), to: to.toISOString(), days },
      cards: {
        users_total: totalUsers,
        users_new_range: newUsersRange,
        users_new_today: newUsersToday,
        users_new_daily_delta_pct: Number(dailyUserDelta.toFixed(2)),
        subscribers_active: activeSubscribers.length,
        subscriptions_expiring_7d: expiringSoon,
        activity_events_range: activityRange,
        activity_events_today: activityToday,
        activity_daily_delta_pct: Number(dailyActivityDelta.toFixed(2)),
        webhooks_24h: webhook24h,
      },
    };
  }

  async listUsers(query: AdminListUsersQueryDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const where: any = {};

    if (query.q) {
      where.OR = [
        { email: { contains: query.q, mode: 'insensitive' } },
        { displayName: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.tier) {
      where.subscriptionTier = query.tier;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          displayName: true,
          photoUrl: true,
          subscriptionTier: true,
          maxCollections: true,
          maxItemsPerCollection: true,
          maxTags: true,
          maxDevices: true,
          createdAt: true,
          updatedAt: true,
          lastSyncAt: true,
          _count: {
            select: {
              subscriptions: true,
              collections: true,
              sessions: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      limit,
      offset,
      hasMore: offset + users.length < total,
    };
  }

  async getUserDetails(userId: string) {
    const [user, subscriptions, activeSessions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          displayName: true,
          photoUrl: true,
          provider: true,
          subscriptionTier: true,
          maxCollections: true,
          maxItemsPerCollection: true,
          maxTags: true,
          maxDevices: true,
          createdAt: true,
          updatedAt: true,
          lastSyncAt: true,
        },
      }),
      this.prisma.subscription.findMany({
        where: { userId },
        orderBy: [{ expiryDate: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      this.prisma.deviceSession.count({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    if (!user) {
      return { found: false };
    }

    return {
      found: true,
      user,
      subscriptions,
      activeSessions,
    };
  }

  async updateUserTier(
    adminUserId: string,
    userId: string,
    dto: AdminUpdateUserTierDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return { updated: false, reason: 'not_found' };
    }

    const applyTierLimits = dto.applyTierLimits ?? true;
    const tierLimits = this.getLimitsForTier(dto.tier);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: dto.tier as unknown as any,
        ...(applyTierLimits && tierLimits
          ? {
              maxCollections: tierLimits.maxCollections,
              maxItemsPerCollection: tierLimits.maxItemsPerCollection,
              maxTags: tierLimits.maxTags,
              maxDevices: tierLimits.maxDevices,
            }
          : {}),
      },
      select: {
        id: true,
        subscriptionTier: true,
        maxCollections: true,
        maxItemsPerCollection: true,
        maxTags: true,
        maxDevices: true,
        updatedAt: true,
      },
    });

    await this.logAdminChange(adminUserId, 'admin_user_tier_updated', {
      userId,
      tier: dto.tier,
      applyTierLimits,
    });

    return {
      updated: true,
      user: updated,
    };
  }

  async updateUserLimits(
    adminUserId: string,
    userId: string,
    dto: AdminUpdateUserLimitsDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return { updated: false, reason: 'not_found' };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        maxCollections: dto.maxCollections,
        maxItemsPerCollection: dto.maxItemsPerCollection,
        maxTags: dto.maxTags,
        maxDevices: dto.maxDevices,
      },
      select: {
        id: true,
        subscriptionTier: true,
        maxCollections: true,
        maxItemsPerCollection: true,
        maxTags: true,
        maxDevices: true,
        updatedAt: true,
      },
    });

    await this.logAdminChange(adminUserId, 'admin_user_limits_updated', {
      userId,
      limits: dto,
    });

    return {
      updated: true,
      user: updated,
    };
  }

  private async getJsonSystemConfig(
    key: string,
  ): Promise<Record<string, unknown> | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
      select: { value: true },
    });

    if (!config?.value) {
      return null;
    }

    try {
      return JSON.parse(config.value);
    } catch {
      return null;
    }
  }

  private async logAdminChange(
    adminUserId: string,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.userActivity.create({
      data: {
        userId: adminUserId,
        action,
        entityType: 'system_config',
        metadata: JSON.stringify(metadata),
      },
    });
  }

  private getLimitsForTier(tier: SubscriptionTier) {
    const limits = this.configService.get<
      Record<
        string,
        {
          maxCollections: number;
          maxItemsPerCollection: number;
          maxTags: number;
          maxDevices: number;
        }
      >
    >('app.limits');
    if (!limits) return null;
    return limits[tier.toLowerCase()] || null;
  }
}
