import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SubscriptionStatus,
  SubscriptionTier,
  type User,
} from '@/generated/prisma/client';
import { type AuthUserLimits } from '@/common/decorators/current-user.decorator';

type EntitlementSource = 'BASE' | 'PAID_SUBSCRIPTION' | 'TRIAL' | 'GLOBAL_FREE';

interface EffectiveEntitlement {
  tier: SubscriptionTier;
  limits: AuthUserLimits;
  source: EntitlementSource;
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resolveForUser(
    user: Pick<
      User,
      | 'id'
      | 'subscriptionTier'
      | 'maxCollections'
      | 'maxItemsPerCollection'
      | 'maxTags'
      | 'maxDevices'
      | 'createdAt'
    >,
  ): Promise<EffectiveEntitlement> {
    const now = new Date();
    const baseTier = user.subscriptionTier;

    const base: EffectiveEntitlement = {
      tier: baseTier,
      limits: {
        maxCollections: user.maxCollections,
        maxItemsPerCollection: user.maxItemsPerCollection,
        maxTags: user.maxTags,
        maxDevices: user.maxDevices,
      },
      source: 'BASE',
    };

    const paidTier = await this.getActivePaidTier(user.id, now);
    const trialTier = await this.getTrialTierIfActive(user.createdAt, now);
    const globalTier = await this.getGlobalFreeTierIfActive(now);

    const candidates: Array<{
      tier: SubscriptionTier;
      source: EntitlementSource;
    }> = [{ tier: base.tier, source: 'BASE' }];

    if (paidTier) candidates.push({ tier: paidTier, source: 'PAID_SUBSCRIPTION' });
    if (trialTier) candidates.push({ tier: trialTier, source: 'TRIAL' });
    if (globalTier) candidates.push({ tier: globalTier, source: 'GLOBAL_FREE' });

    const winner = candidates.sort(
      (a, b) => this.tierRank(b.tier) - this.tierRank(a.tier),
    )[0];

    if (winner.source === 'BASE') {
      return base;
    }

    return {
      tier: winner.tier,
      limits: this.getLimitsForTier(winner.tier) || base.limits,
      source: winner.source,
    };
  }

  private async getActivePaidTier(
    userId: string,
    now: Date,
  ): Promise<SubscriptionTier | null> {
    const active = await this.prisma.subscription.findMany({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.GRACE_PERIOD],
        },
        expiryDate: {
          gt: now,
        },
      },
      select: {
        tier: true,
      },
    });

    if (!active.length) {
      return null;
    }

    return active
      .map((s) => s.tier)
      .sort((a, b) => this.tierRank(b) - this.tierRank(a))[0];
  }

  private async getTrialTierIfActive(
    userCreatedAt: Date,
    now: Date,
  ): Promise<SubscriptionTier | null> {
    const trialConfig = await this.getTrialConfig();
    const enabled = trialConfig.enabled;
    if (!enabled) {
      return null;
    }

    const days = trialConfig.days;
    const trialTier = this.toSubscriptionTier(trialConfig.tier);

    const trialEnd = new Date(userCreatedAt);
    trialEnd.setDate(trialEnd.getDate() + Math.max(0, days));

    return now < trialEnd ? trialTier : null;
  }

  private async getGlobalFreeTierIfActive(
    now: Date,
  ): Promise<SubscriptionTier | null> {
    const globalFree = await this.getGlobalFreeConfig();
    const enabled = globalFree.enabled;
    if (!enabled) {
      return null;
    }

    const tier = this.toSubscriptionTier(globalFree.tier);
    const startRaw = globalFree.startAt;
    const endRaw = globalFree.endAt;

    const startAt = startRaw ? new Date(startRaw) : null;
    const endAt = endRaw ? new Date(endRaw) : null;

    const startsOk = !startAt || now >= startAt;
    const endsOk = !endAt || now <= endAt;

    return startsOk && endsOk ? tier : null;
  }

  private async getTrialConfig() {
    const envConfig = {
      enabled: this.configService.get<boolean>('app.trial.enabled') ?? true,
      days: this.configService.get<number>('app.trial.days') || 14,
      tier: this.configService.get<string>('app.trial.tier') || 'PREMIUM',
    };
    const dbOverride = await this.getJsonSystemConfig('trial_config');

    return {
      enabled: dbOverride?.enabled ?? envConfig.enabled,
      days: Number(dbOverride?.days ?? envConfig.days),
      tier: String(dbOverride?.tier ?? envConfig.tier),
    };
  }

  private async getGlobalFreeConfig() {
    const envConfig = {
      enabled:
        this.configService.get<boolean>('app.globalFreeAccess.enabled') ?? false,
      tier: this.configService.get<string>('app.globalFreeAccess.tier') || 'PREMIUM',
      startAt: this.configService.get<string | null>('app.globalFreeAccess.startAt'),
      endAt: this.configService.get<string | null>('app.globalFreeAccess.endAt'),
    };
    const dbOverride = await this.getJsonSystemConfig('global_free_access');

    return {
      enabled: dbOverride?.enabled ?? envConfig.enabled,
      tier: String(dbOverride?.tier ?? envConfig.tier),
      startAt: (dbOverride?.startAt as string | null | undefined) ?? envConfig.startAt,
      endAt: (dbOverride?.endAt as string | null | undefined) ?? envConfig.endAt,
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

  private getLimitsForTier(tier: SubscriptionTier): AuthUserLimits | null {
    const limits = this.configService.get<Record<string, AuthUserLimits>>(
      'app.limits',
    );

    if (!limits) {
      return null;
    }

    const key = tier.toLowerCase();
    return limits[key] || null;
  }

  private toSubscriptionTier(value: string): SubscriptionTier {
    const upper = value.toUpperCase();
    if (upper === SubscriptionTier.ULTIMATE) return SubscriptionTier.ULTIMATE;
    if (upper === SubscriptionTier.PREMIUM) return SubscriptionTier.PREMIUM;
    return SubscriptionTier.FREE;
  }

  private tierRank(tier: SubscriptionTier) {
    if (tier === SubscriptionTier.ULTIMATE) return 3;
    if (tier === SubscriptionTier.PREMIUM) return 2;
    return 1;
  }
}
