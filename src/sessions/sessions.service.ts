import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMySessions(userId: string) {
    const sessions = await this.prisma.deviceSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [{ lastActiveAt: 'desc' }],
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceOs: true,
        appVersion: true,
        ipAddress: true,
        userAgent: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      sessions,
      total: sessions.length,
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const updated = await this.prisma.deviceSession.updateMany({
      where: {
        id: sessionId,
        userId,
        isActive: true,
      },
      data: { isActive: false },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Session not found');
    }

    return { revoked: true };
  }

  async revokeOtherSessions(userId: string, currentSessionId?: string) {
    const where: any = {
      userId,
      isActive: true,
    };
    if (currentSessionId) {
      where.id = { not: currentSessionId };
    }

    const result = await this.prisma.deviceSession.updateMany({
      where,
      data: { isActive: false },
    });

    return { revoked: result.count };
  }

  async cleanupExpiredSessions() {
    const result = await this.prisma.deviceSession.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    });

    return { cleaned: result.count };
  }
}
