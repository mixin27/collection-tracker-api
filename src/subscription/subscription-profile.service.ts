import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionStatus,
  SubscriptionTier,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUserLimits } from '@/common/decorators/current-user.decorator';

@Injectable()
export class SubscriptionProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async syncUserSubscriptionProfile(userId: string) {
    const now = new Date();
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
      select: { tier: true },
    });

    const tier =
      active
        .map((s) => s.tier)
        .sort((a, b) => this.rankTier(b) - this.rankTier(a))[0] ||
      SubscriptionTier.FREE;
    const limits = this.getLimitsForTier(tier);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        maxCollections: limits.maxCollections,
        maxItemsPerCollection: limits.maxItemsPerCollection,
        maxTags: limits.maxTags,
        maxDevices: limits.maxDevices,
      },
    });
  }

  private getLimitsForTier(tier: SubscriptionTier): AuthUserLimits {
    const limits = this.configService.get<Record<string, AuthUserLimits>>(
      'app.limits',
    );
    const fallback: AuthUserLimits = {
      maxCollections: 2,
      maxItemsPerCollection: 50,
      maxTags: 10,
      maxDevices: 1,
    };
    if (!limits) return fallback;
    return limits[tier.toLowerCase()] || fallback;
  }

  private rankTier(tier: SubscriptionTier) {
    if (tier === SubscriptionTier.ULTIMATE) return 3;
    if (tier === SubscriptionTier.PREMIUM) return 2;
    return 1;
  }
}
