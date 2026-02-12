import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  RefreshTokenDto,
  AuthResponseDto,
} from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { AuthProvider, SubscriptionTier } from '@/generated/prisma/client';
import { JwtPayload } from '@/common/strategies/jwt.strategy';

interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user with local credentials
   */
  async register(
    dto: RegisterDto,
    clientInfo?: ClientInfo,
  ): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Get default limits for FREE tier
    const limits = this.configService.get('app.limits.free');

    // Create user and account in transaction
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        provider: AuthProvider.LOCAL,
        subscriptionTier: SubscriptionTier.FREE,
        maxCollections: limits.maxCollections,
        maxItemsPerCollection: limits.maxItemsPerCollection,
        maxTags: limits.maxTags,
        maxDevices: limits.maxDevices,
        accounts: {
          create: {
            provider: 'local',
            password: hashedPassword,
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        photoUrl: true,
        subscriptionTier: true,
      },
    });

    // Create device session
    const session = await this.createDeviceSession(
      user.id,
      dto.deviceId,
      dto.deviceName,
      dto.deviceOs,
      dto.appVersion,
      clientInfo,
    );

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      dto.deviceId,
      session.id,
    );

    // Update session with tokens
    await this.prisma.deviceSession.update({
      where: { id: session.id },
      data: {
        accessToken,
        refreshToken,
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
      },
    });

    this.logger.log(`User registered: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user,
      session: {
        id: session.id,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        expiresAt: session.expiresAt,
      },
    };
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto, clientInfo?: ClientInfo): Promise<AuthResponseDto> {
    // Find user with account
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        accounts: {
          where: { provider: 'local' },
        },
      },
    });

    if (!user || user.accounts.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const account = user.accounts[0];
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      account.password!,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check device limit
    await this.enforceDeviceLimit(user.id, dto.deviceId, user.maxDevices);

    // Create or update device session
    const session = await this.upsertDeviceSession(
      user.id,
      dto.deviceId,
      dto.deviceName,
      dto.deviceOs,
      dto.appVersion,
      clientInfo,
    );

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      dto.deviceId,
      session.id,
    );

    // Update session with tokens
    await this.prisma.deviceSession.update({
      where: { id: session.id },
      data: {
        accessToken,
        refreshToken,
        lastActiveAt: new Date(),
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
      },
    });

    this.logger.log(`User logged in: ${user.email} from ${dto.deviceName}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        subscriptionTier: user.subscriptionTier,
      },
      session: {
        id: session.id,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        expiresAt: session.expiresAt,
      },
    };
  }

  /**
   * Authenticate with Google OAuth (mobile native flow)
   */
  async googleAuth(
    dto: GoogleAuthDto,
    clientInfo?: ClientInfo,
  ): Promise<AuthResponseDto> {
    // Verify Google ID token (implement token verification)
    const googleUser = await this.verifyGoogleIdToken(dto.idToken);

    if (!googleUser) {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { accounts: true },
    });

    const limits = this.configService.get('app.limits.free');

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          displayName: googleUser.name,
          photoUrl: googleUser.picture,
          provider: AuthProvider.GOOGLE,
          emailVerified: googleUser.email_verified,
          subscriptionTier: SubscriptionTier.FREE,
          maxCollections: limits.maxCollections,
          maxItemsPerCollection: limits.maxItemsPerCollection,
          maxTags: limits.maxTags,
          maxDevices: limits.maxDevices,
          accounts: {
            create: {
              provider: 'google',
              providerAccountId: googleUser.sub,
              idToken: dto.idToken,
            },
          },
        },
        include: { accounts: true },
      });
    } else {
      // Update existing user
      const googleAccount = user.accounts.find((a) => a.provider === 'google');
      if (!googleAccount) {
        await this.prisma.account.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerAccountId: googleUser.sub,
            idToken: dto.idToken,
          },
        });
      }
    }

    // Check device limit
    await this.enforceDeviceLimit(user.id, dto.deviceId, user.maxDevices);

    // Create or update session
    const session = await this.upsertDeviceSession(
      user.id,
      dto.deviceId,
      dto.deviceName,
      dto.deviceOs,
      dto.appVersion,
      clientInfo,
    );

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      dto.deviceId,
      session.id,
    );

    // Update session
    await this.prisma.deviceSession.update({
      where: { id: session.id },
      data: {
        accessToken,
        refreshToken,
        lastActiveAt: new Date(),
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
      },
    });

    this.logger.log(`User authenticated via Google: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        subscriptionTier: user.subscriptionTier,
      },
      session: {
        id: session.id,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        expiresAt: session.expiresAt,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    dto: RefreshTokenDto,
    clientInfo?: ClientInfo,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find session
      const session = await this.prisma.deviceSession.findUnique({
        where: { id: payload.sessionId },
      });

      if (
        !session ||
        !session.isActive ||
        session.refreshToken !== dto.refreshToken
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Generate new tokens (with rotation)
      const tokens = await this.generateTokens(
        payload.sub,
        payload.email,
        dto.deviceId,
        session.id,
      );

      // Update session with new tokens
      await this.prisma.deviceSession.update({
        where: { id: session.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          lastActiveAt: new Date(),
          ipAddress: clientInfo?.ipAddress,
          userAgent: clientInfo?.userAgent,
        },
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout from current device
   */
  async logout(userId: string, deviceId: string): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: {
        userId,
        deviceId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`User ${userId} logged out from device ${deviceId}`);
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    this.logger.log(`User ${userId} logged out from all devices`);
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    deviceId: string,
    sessionId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      deviceId,
      sessionId,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      deviceId,
      sessionId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpiration'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiration'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Create a new device session
   */
  private async createDeviceSession(
    userId: string,
    deviceId: string,
    deviceName: string,
    deviceOs: string,
    appVersion?: string,
    clientInfo?: ClientInfo,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    return this.prisma.deviceSession.create({
      data: {
        userId,
        deviceId,
        deviceName,
        deviceOs,
        appVersion,
        isActive: true,
        expiresAt,
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        refreshToken: '', // Will be updated later
      },
    });
  }

  /**
   * Create or update device session
   */
  private async upsertDeviceSession(
    userId: string,
    deviceId: string,
    deviceName: string,
    deviceOs: string,
    appVersion?: string,
    clientInfo?: ClientInfo,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.deviceSession.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
      update: {
        deviceName,
        deviceOs,
        appVersion,
        isActive: true,
        expiresAt,
        lastActiveAt: new Date(),
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
      },
      create: {
        userId,
        deviceId,
        deviceName,
        deviceOs,
        appVersion,
        isActive: true,
        expiresAt,
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        refreshToken: '',
      },
    });
  }

  /**
   * Enforce maximum active devices limit
   */
  private async enforceDeviceLimit(
    userId: string,
    currentDeviceId: string,
    maxDevices: number,
  ) {
    const activeSessions = await this.prisma.deviceSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastActiveAt: 'asc',
      },
    });

    // Check if current device already has a session
    const hasCurrentDevice = activeSessions.some(
      (s) => s.deviceId === currentDeviceId,
    );

    if (!hasCurrentDevice && activeSessions.length >= maxDevices) {
      // Deactivate oldest session
      await this.prisma.deviceSession.update({
        where: { id: activeSessions[0].id },
        data: { isActive: false },
      });

      this.logger.warn(
        `Device limit reached for user ${userId}. Deactivated oldest session: ${activeSessions[0].deviceName}`,
      );
    }
  }

  /**
   * Verify Google ID token using Google's tokeninfo endpoint.
   */
  private async verifyGoogleIdToken(idToken: string): Promise<any> {
    try {
      const googleClientId = this.configService.get<string>('google.clientId');
      if (!googleClientId) {
        this.logger.error(
          'GOOGLE_CLIENT_ID is not configured. Google authentication is disabled.',
        );
        return null;
      }

      const response = await axios.get(
        'https://oauth2.googleapis.com/tokeninfo',
        {
          params: { id_token: idToken },
          timeout: 5000,
        },
      );

      const payload = response.data as {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
        email_verified?: string | boolean;
        aud?: string;
        iss?: string;
        exp?: string;
      };

      const isAudienceValid = payload.aud === googleClientId;
      const isIssuerValid =
        payload.iss === 'accounts.google.com' ||
        payload.iss === 'https://accounts.google.com';
      const expiresAt = Number(payload.exp ?? '0');
      const isExpired = !expiresAt || expiresAt * 1000 <= Date.now();
      const isEmailVerified =
        payload.email_verified === true || payload.email_verified === 'true';

      if (
        !payload.sub ||
        !payload.email ||
        !isAudienceValid ||
        !isIssuerValid ||
        isExpired ||
        !isEmailVerified
      ) {
        this.logger.warn('Google token verification failed claim validation');
        return null;
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: true,
      };
    } catch (error) {
      this.logger.error('Failed to verify Google token', error);
      return null;
    }
  }
}
