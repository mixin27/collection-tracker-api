import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

jest.mock('@/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('@/subscription/subscription-profile.service', () => ({
  SubscriptionProfileService: class SubscriptionProfileService {},
}));

describe('PaymentsService', () => {
  const makeService = () => {
    const prisma = {
      systemConfig: {
        create: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    const config = {
      get: jest.fn(),
    } as unknown as ConfigService;

    const subscriptionProfileService = {
      syncUserSubscriptionProfile: jest.fn(),
    } as any;

    const service = new PaymentsService(
      prisma,
      config,
      subscriptionProfileService,
    );

    return { service, prisma, config, subscriptionProfileService };
  };

  it('ignores duplicate Google webhook events idempotently', async () => {
    const { service, prisma, subscriptionProfileService } = makeService();
    jest
      .spyOn(service as any, 'validateGoogleWebhookAuthToken')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'verifyGooglePlayPurchase').mockResolvedValue({
      status: 'ACTIVE',
      tier: 'PREMIUM',
      purchaseDate: new Date(),
      expiryDate: new Date(Date.now() + 3600 * 1000),
      autoRenewing: true,
      orderId: 'order1',
      receiptData: '{}',
    });

    prisma.systemConfig.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: 'P2002' });
    prisma.subscription.findUnique.mockResolvedValue({ userId: 'u1' });
    prisma.subscription.update.mockResolvedValue({});
    subscriptionProfileService.syncUserSubscriptionProfile.mockResolvedValue(
      undefined,
    );

    const payload = {
      message: {
        messageId: 'm-1',
        data: Buffer.from(
          JSON.stringify({
            subscriptionNotification: {
              purchaseToken: 'token-1',
              subscriptionId: 'premium_monthly',
            },
          }),
        ).toString('base64'),
      },
    };

    const first = await service.handleGoogleWebhook(payload, undefined, 'Bearer t');
    const second = await service.handleGoogleWebhook(
      payload,
      undefined,
      'Bearer t',
    );

    expect(first).toEqual({ processed: true });
    expect(second).toEqual({ processed: true, duplicate: true });
    expect(prisma.subscription.update).toHaveBeenCalledTimes(1);
  });

  it('reconciles active subscriptions and syncs affected users', async () => {
    const { service, prisma, subscriptionProfileService } = makeService();
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 's1',
        userId: 'u1',
        platform: 'GOOGLE_PLAY',
        productId: 'premium_monthly',
        purchaseToken: 'token-g',
      },
      {
        id: 's2',
        userId: 'u2',
        platform: 'APPLE_STORE',
        productId: 'premium_monthly',
        purchaseToken: 'token-a',
      },
    ]);
    prisma.subscription.update.mockResolvedValue({});
    subscriptionProfileService.syncUserSubscriptionProfile.mockResolvedValue(
      undefined,
    );

    jest.spyOn(service as any, 'verifyGooglePlayPurchase').mockResolvedValue({
      status: 'ACTIVE',
      tier: 'PREMIUM',
      purchaseDate: new Date(),
      expiryDate: new Date(Date.now() + 3600 * 1000),
      autoRenewing: true,
      orderId: 'order1',
      receiptData: '{}',
    });
    jest
      .spyOn(service as any, 'verifyApplePurchase')
      .mockRejectedValue(new Error('apple failed'));

    const result = await service.reconcileActiveSubscriptions(10);

    expect(result).toMatchObject({
      processed: 2,
      updated: 1,
      failed: 1,
      usersSynced: 1,
    });
    expect(prisma.subscription.update).toHaveBeenCalledTimes(1);
    expect(subscriptionProfileService.syncUserSubscriptionProfile).toHaveBeenCalledWith(
      'u1',
    );
  });
});
