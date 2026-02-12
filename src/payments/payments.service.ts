import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createSign, createVerify, X509Certificate } from 'crypto';
import {
  PaymentPlatform,
  SubscriptionStatus,
  SubscriptionTier,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { VerifyPurchaseDto } from './dto/payment.dto';
import { AuthUserLimits } from '@/common/decorators/current-user.decorator';

interface NormalizedVerificationResult {
  platform: PaymentPlatform;
  productId: string;
  purchaseToken: string;
  orderId?: string | null;
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  purchaseDate: Date;
  expiryDate: Date;
  autoRenewing: boolean;
  receiptData?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async verifyPurchase(userId: string, dto: VerifyPurchaseDto) {
    const verification =
      dto.platform === PaymentPlatform.GOOGLE_PLAY
        ? await this.verifyGooglePlayPurchase(dto)
        : await this.verifyApplePurchase(dto);

    const subscription = await this.prisma.subscription.upsert({
      where: {
        purchaseToken: verification.purchaseToken,
      },
      update: {
        userId,
        platform: verification.platform,
        productId: verification.productId,
        orderId: verification.orderId,
        status: verification.status,
        tier: verification.tier,
        purchaseDate: verification.purchaseDate,
        expiryDate: verification.expiryDate,
        autoRenewing: verification.autoRenewing,
        receiptData: verification.receiptData,
        lastVerifiedAt: new Date(),
        verificationAttempts: {
          increment: 1,
        },
      },
      create: {
        userId,
        platform: verification.platform,
        productId: verification.productId,
        purchaseToken: verification.purchaseToken,
        orderId: verification.orderId,
        status: verification.status,
        tier: verification.tier,
        purchaseDate: verification.purchaseDate,
        expiryDate: verification.expiryDate,
        autoRenewing: verification.autoRenewing,
        receiptData: verification.receiptData,
        lastVerifiedAt: new Date(),
        verificationAttempts: 1,
      },
    });

    await this.syncUserSubscriptionProfile(userId);

    return {
      verified: true,
      subscription,
    };
  }

  async getUserSubscriptions(userId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: [{ expiryDate: 'desc' }, { createdAt: 'desc' }],
    });
    return { subscriptions };
  }

  async handleGoogleWebhook(
    payload: any,
    secret?: string,
    authorizationHeader?: string,
  ) {
    const expectedSecret = this.configService.get<string>(
      'app.payments.google.webhookSecret',
    );
    if (expectedSecret && secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid Google webhook secret');
    }
    await this.validateGoogleWebhookAuthToken(authorizationHeader);

    const encodedData = payload?.message?.data;
    if (!encodedData) {
      throw new BadRequestException('Missing Google Pub/Sub message data');
    }

    const decoded = JSON.parse(
      Buffer.from(encodedData, 'base64').toString('utf8'),
    ) as {
      packageName?: string;
      subscriptionNotification?: {
        purchaseToken?: string;
        subscriptionId?: string;
      };
    };

    const purchaseToken = decoded.subscriptionNotification?.purchaseToken;
    const productId = decoded.subscriptionNotification?.subscriptionId;
    if (!purchaseToken || !productId) {
      throw new BadRequestException('Invalid Google RTDN payload');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { purchaseToken },
    });
    if (!existing) {
      this.logger.warn(`Received RTDN for unknown purchase token: ${purchaseToken}`);
      return { processed: false, reason: 'unknown_purchase_token' };
    }

    const verification = await this.verifyGooglePlayPurchase({
      platform: PaymentPlatform.GOOGLE_PLAY,
      productId,
      purchaseToken,
    });

    await this.prisma.subscription.update({
      where: { purchaseToken },
      data: {
        status: verification.status,
        tier: verification.tier,
        purchaseDate: verification.purchaseDate,
        expiryDate: verification.expiryDate,
        autoRenewing: verification.autoRenewing,
        orderId: verification.orderId,
        receiptData: verification.receiptData,
        lastVerifiedAt: new Date(),
        verificationAttempts: { increment: 1 },
      },
    });

    await this.syncUserSubscriptionProfile(existing.userId);
    return { processed: true };
  }

  async handleAppleWebhook(payload: any, secret?: string) {
    const expectedSecret = this.configService.get<string>(
      'app.payments.apple.webhookSecret',
    );
    if (expectedSecret && secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid Apple webhook secret');
    }

    const signedPayload = payload?.signedPayload;
    if (!signedPayload || typeof signedPayload !== 'string') {
      throw new BadRequestException('Missing Apple signedPayload');
    }

    const bundleId = this.configService.get<string>('app.payments.apple.bundleId');
    const notificationPayload = this.verifyAndDecodeAppleJws(
      signedPayload,
      bundleId,
    ) as {
      data?: {
        signedTransactionInfo?: string;
      };
    };

    const signedTransactionInfo = notificationPayload?.data?.signedTransactionInfo;
    if (!signedTransactionInfo) {
      throw new BadRequestException('Missing Apple signedTransactionInfo');
    }

    const transactionInfo = this.verifyAndDecodeAppleJws(
      signedTransactionInfo,
      bundleId,
    ) as {
      productId?: string;
      transactionId?: string;
      originalTransactionId?: string;
      purchaseDate?: number;
      expiresDate?: number;
      revocationDate?: number;
    };

    const token =
      transactionInfo.originalTransactionId || transactionInfo.transactionId;
    if (!token || !transactionInfo.productId || !transactionInfo.transactionId) {
      throw new BadRequestException('Invalid Apple transaction payload');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { purchaseToken: token },
    });

    const now = Date.now();
    const expiry = transactionInfo.expiresDate
      ? new Date(transactionInfo.expiresDate)
      : new Date(now);
    const purchase = transactionInfo.purchaseDate
      ? new Date(transactionInfo.purchaseDate)
      : new Date(now);
    const active =
      !transactionInfo.revocationDate &&
      expiry.getTime() > now &&
      purchase.getTime() <= now;

    const status = active ? SubscriptionStatus.ACTIVE : SubscriptionStatus.EXPIRED;
    const tier = this.resolveTierFromProductId(transactionInfo.productId);

    if (existing) {
      await this.prisma.subscription.update({
        where: { purchaseToken: token },
        data: {
          productId: transactionInfo.productId,
          platform: PaymentPlatform.APPLE_STORE,
          status,
          tier,
          purchaseDate: purchase,
          expiryDate: expiry,
          autoRenewing: active,
          receiptData: signedTransactionInfo,
          lastVerifiedAt: new Date(),
          verificationAttempts: { increment: 1 },
        },
      });
      await this.syncUserSubscriptionProfile(existing.userId);
    }

    return { processed: true, matchedExisting: Boolean(existing) };
  }

  private async verifyGooglePlayPurchase(
    dto: Pick<VerifyPurchaseDto, 'productId' | 'purchaseToken'> & {
      platform?: PaymentPlatform;
    },
  ): Promise<NormalizedVerificationResult> {
    if (!dto.purchaseToken) {
      throw new BadRequestException('purchaseToken is required for Google Play');
    }

    const packageName = this.configService.get<string>(
      'app.payments.google.packageName',
    );
    const serviceAccountEmail = this.configService.get<string>(
      'app.payments.google.serviceAccountEmail',
    );
    const privateKey = this.configService.get<string>(
      'app.payments.google.privateKey',
    );

    if (!packageName || !serviceAccountEmail || !privateKey) {
      throw new BadRequestException('Google Play API credentials are not configured');
    }

    const accessToken = await this.getGoogleAccessToken(
      serviceAccountEmail,
      privateKey,
    );

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(dto.purchaseToken)}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 8000,
    });

    const data = response.data as {
      startTime?: string;
      subscriptionState?: string;
      latestOrderId?: string;
      lineItems?: Array<{
        productId?: string;
        expiryTime?: string;
        autoRenewingPlan?: Record<string, unknown>;
      }>;
    };

    const lineItem = data.lineItems?.[0];
    const productId = lineItem?.productId || dto.productId;
    const expiryDate = lineItem?.expiryTime
      ? new Date(lineItem.expiryTime)
      : new Date();
    const purchaseDate = data.startTime ? new Date(data.startTime) : new Date();

    const status = this.mapGoogleSubscriptionState(data.subscriptionState, expiryDate);
    const tier = this.resolveTierFromProductId(productId);

    return {
      platform: PaymentPlatform.GOOGLE_PLAY,
      productId,
      purchaseToken: dto.purchaseToken,
      orderId: data.latestOrderId,
      status,
      tier,
      purchaseDate,
      expiryDate,
      autoRenewing: Boolean(lineItem?.autoRenewingPlan),
      receiptData: JSON.stringify(data),
    };
  }

  private async verifyApplePurchase(
    dto: Pick<VerifyPurchaseDto, 'productId' | 'transactionId'> & {
      platform?: PaymentPlatform;
    },
  ): Promise<NormalizedVerificationResult> {
    if (!dto.transactionId) {
      throw new BadRequestException('transactionId is required for Apple Store');
    }

    const issuerId = this.configService.get<string>('app.payments.apple.issuerId');
    const keyId = this.configService.get<string>('app.payments.apple.keyId');
    const privateKey = this.configService.get<string>('app.payments.apple.privateKey');
    const bundleId = this.configService.get<string>('app.payments.apple.bundleId');
    const useSandboxApi = this.configService.get<boolean>(
      'app.payments.apple.useSandboxApi',
    );

    if (!issuerId || !keyId || !privateKey || !bundleId) {
      throw new BadRequestException('Apple Store API credentials are not configured');
    }

    const token = this.createAppleApiJwt({
      issuerId,
      keyId,
      privateKey,
      bundleId,
    });
    const host = useSandboxApi
      ? 'https://api.storekit-sandbox.itunes.apple.com'
      : 'https://api.storekit.itunes.apple.com';

    const response = await axios.get(
      `${host}/inApps/v1/transactions/${encodeURIComponent(dto.transactionId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 8000,
      },
    );

    const payload = response.data as { signedTransactionInfo?: string };
    if (!payload.signedTransactionInfo) {
      throw new BadRequestException(
        'Apple response missing signedTransactionInfo',
      );
    }

    const bundleIdFromConfig = this.configService.get<string>(
      'app.payments.apple.bundleId',
    );
    const transaction = this.verifyAndDecodeAppleJws(
      payload.signedTransactionInfo,
      bundleIdFromConfig,
    ) as {
      productId?: string;
      transactionId?: string;
      originalTransactionId?: string;
      purchaseDate?: number;
      expiresDate?: number;
      revocationDate?: number;
    };

    const purchaseToken =
      transaction.originalTransactionId || transaction.transactionId;
    if (!purchaseToken) {
      throw new BadRequestException('Apple transaction token is missing');
    }

    const productId = transaction.productId || dto.productId;
    const expiryDate = transaction.expiresDate
      ? new Date(transaction.expiresDate)
      : new Date();
    const purchaseDate = transaction.purchaseDate
      ? new Date(transaction.purchaseDate)
      : new Date();
    const active =
      !transaction.revocationDate &&
      expiryDate.getTime() > Date.now() &&
      purchaseDate.getTime() <= Date.now();

    return {
      platform: PaymentPlatform.APPLE_STORE,
      productId,
      purchaseToken,
      status: active ? SubscriptionStatus.ACTIVE : SubscriptionStatus.EXPIRED,
      tier: this.resolveTierFromProductId(productId),
      purchaseDate,
      expiryDate,
      autoRenewing: active,
      receiptData: payload.signedTransactionInfo,
    };
  }

  private async syncUserSubscriptionProfile(userId: string) {
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

  private resolveTierFromProductId(productId: string): SubscriptionTier {
    const map = this.configService.get<Record<string, string>>(
      'app.payments.productTierMap',
    );
    const mapped = map?.[productId];
    if (mapped === SubscriptionTier.ULTIMATE) return SubscriptionTier.ULTIMATE;
    if (mapped === SubscriptionTier.PREMIUM) return SubscriptionTier.PREMIUM;
    return productId.toLowerCase().includes('ultimate')
      ? SubscriptionTier.ULTIMATE
      : productId.toLowerCase().includes('premium')
        ? SubscriptionTier.PREMIUM
        : SubscriptionTier.FREE;
  }

  private rankTier(tier: SubscriptionTier) {
    if (tier === SubscriptionTier.ULTIMATE) return 3;
    if (tier === SubscriptionTier.PREMIUM) return 2;
    return 1;
  }

  private mapGoogleSubscriptionState(
    state: string | undefined,
    expiryDate: Date,
  ): SubscriptionStatus {
    switch (state) {
      case 'SUBSCRIPTION_STATE_ACTIVE':
        return SubscriptionStatus.ACTIVE;
      case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
        return SubscriptionStatus.GRACE_PERIOD;
      case 'SUBSCRIPTION_STATE_ON_HOLD':
        return SubscriptionStatus.ON_HOLD;
      case 'SUBSCRIPTION_STATE_PAUSED':
        return SubscriptionStatus.PAUSED;
      case 'SUBSCRIPTION_STATE_CANCELED':
      case 'SUBSCRIPTION_STATE_EXPIRED':
        return SubscriptionStatus.EXPIRED;
      default:
        return expiryDate.getTime() > Date.now()
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.EXPIRED;
    }
  }

  private async getGoogleAccessToken(
    serviceAccountEmail: string,
    privateKey: string,
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const assertion = this.createSignedJwt(payload, privateKey, 'RS256');
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString();

    const response = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 8000,
    });

    const token = response.data?.access_token;
    if (!token) {
      throw new BadRequestException('Failed to obtain Google access token');
    }
    return token;
  }

  private async validateGoogleWebhookAuthToken(authorizationHeader?: string) {
    const bearerToken = this.extractBearerToken(authorizationHeader);
    if (!bearerToken) {
      throw new UnauthorizedException('Missing Google webhook bearer token');
    }

    const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: {
        id_token: bearerToken,
      },
      timeout: 5000,
    });

    const tokenInfo = response.data as {
      aud?: string;
      iss?: string;
      exp?: string;
      email?: string;
      email_verified?: string;
    };

    const expectedAudience = this.configService.get<string>(
      'app.payments.google.webhookAudience',
    );
    const expectedEmail = this.configService.get<string>(
      'app.payments.google.webhookExpectedEmail',
    );
    const nowUnix = Math.floor(Date.now() / 1000);
    const exp = Number(tokenInfo.exp || '0');
    const issuerOk =
      tokenInfo.iss === 'accounts.google.com' ||
      tokenInfo.iss === 'https://accounts.google.com';
    const audienceOk = expectedAudience
      ? tokenInfo.aud === expectedAudience
      : Boolean(tokenInfo.aud);
    const emailOk = expectedEmail
      ? tokenInfo.email?.toLowerCase() === expectedEmail.toLowerCase()
      : true;
    const emailVerifiedOk =
      tokenInfo.email_verified === undefined ||
      tokenInfo.email_verified === 'true';

    if (!issuerOk || !audienceOk || !emailOk || !emailVerifiedOk || exp < nowUnix) {
      throw new UnauthorizedException('Invalid Google webhook bearer token');
    }
  }

  private extractBearerToken(authorizationHeader?: string) {
    if (!authorizationHeader) return null;
    const [scheme, token] = authorizationHeader.split(' ');
    if (!scheme || !token) return null;
    return scheme.toLowerCase() === 'bearer' ? token : null;
  }

  private createAppleApiJwt(params: {
    issuerId: string;
    keyId: string;
    privateKey: string;
    bundleId: string;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    return this.createSignedJwt(
      {
        iss: params.issuerId,
        iat: now,
        exp: now + 1200,
        aud: 'appstoreconnect-v1',
        bid: params.bundleId,
      },
      params.privateKey,
      'ES256',
      {
        kid: params.keyId,
      },
    );
  }

  private verifyAndDecodeAppleJws(
    token: string,
    expectedBundleId?: string,
  ): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid Apple JWS format');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = this.decodeJwtSection<Record<string, unknown>>(encodedHeader);
    const x5c = header['x5c'];
    if (!Array.isArray(x5c) || x5c.length === 0) {
      throw new UnauthorizedException('Apple JWS is missing x5c certificate chain');
    }

    const certs = x5c.map((cert) => {
      if (typeof cert !== 'string') {
        throw new UnauthorizedException('Invalid Apple x5c certificate entry');
      }
      return new X509Certificate(Buffer.from(cert, 'base64'));
    });

    this.validateAppleCertificateChain(certs);

    const verifier = createVerify('SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    const signature = Buffer.from(encodedSignature, 'base64url');
    const signatureValid = verifier.verify(certs[0].publicKey, signature);
    if (!signatureValid) {
      throw new UnauthorizedException('Invalid Apple JWS signature');
    }

    const payload = this.decodeJwtSection<Record<string, unknown>>(encodedPayload);
    if (expectedBundleId) {
      const bundleId = payload['bundleId'] || payload['bid'];
      if (bundleId && bundleId !== expectedBundleId) {
        throw new UnauthorizedException('Apple JWS bundle id mismatch');
      }
    }

    return payload;
  }

  private validateAppleCertificateChain(certs: X509Certificate[]) {
    const now = Date.now();
    for (const cert of certs) {
      const validFrom = new Date(cert.validFrom).getTime();
      const validTo = new Date(cert.validTo).getTime();
      if (Number.isNaN(validFrom) || Number.isNaN(validTo)) {
        throw new UnauthorizedException('Invalid Apple certificate validity');
      }
      if (now < validFrom || now > validTo) {
        throw new UnauthorizedException('Apple certificate is expired or not active');
      }
    }

    for (let i = 0; i < certs.length - 1; i++) {
      const issuedByNext = certs[i].verify(certs[i + 1].publicKey);
      if (!issuedByNext) {
        throw new UnauthorizedException('Invalid Apple certificate chain signature');
      }
    }

    const pinnedRootFingerprint = this.configService.get<string>(
      'app.payments.apple.rootCertFingerprint256',
    );
    if (pinnedRootFingerprint) {
      const actual = certs[certs.length - 1].fingerprint256.replaceAll(':', '');
      const expected = pinnedRootFingerprint.replaceAll(':', '').toUpperCase();
      if (actual !== expected) {
        throw new UnauthorizedException('Apple root certificate fingerprint mismatch');
      }
    }
  }

  private createSignedJwt(
    payload: Record<string, unknown>,
    privateKey: string,
    algorithm: 'RS256' | 'ES256',
    additionalHeader: Record<string, unknown> = {},
  ): string {
    const header = {
      alg: algorithm,
      typ: 'JWT',
      ...additionalHeader,
    };

    const unsigned = `${this.base64UrlEncode(JSON.stringify(header))}.${this.base64UrlEncode(JSON.stringify(payload))}`;

    const signer = createSign('SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(privateKey);

    return `${unsigned}.${this.base64UrlEncode(signature)}`;
  }

  private decodeJwtPayload(token: string): unknown {
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new BadRequestException('Invalid token payload format');
    }
    return this.decodeJwtSection(parts[1]);
  }

  private decodeJwtSection<T = unknown>(section: string): T {
    const json = Buffer.from(section, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  }

  private base64UrlEncode(input: string | Buffer): string {
    const base64 = Buffer.isBuffer(input)
      ? input.toString('base64')
      : Buffer.from(input, 'utf8').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}
