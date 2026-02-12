import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  deviceId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret')!,
    });
  }

  async validate(payload: JwtPayload) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        subscriptionTier: true,
        maxCollections: true,
        maxItemsPerCollection: true,
        maxTags: true,
        maxDevices: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify session is still active
    const session = await this.prisma.deviceSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    return {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      subscriptionTier: user.subscriptionTier,
      deviceId: payload.deviceId,
      sessionId: payload.sessionId,
      limits: {
        maxCollections: user.maxCollections,
        maxItemsPerCollection: user.maxItemsPerCollection,
        maxTags: user.maxTags,
        maxDevices: user.maxDevices,
      },
    };
  }
}
