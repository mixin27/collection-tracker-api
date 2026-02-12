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
}
