import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ActivityQueryDto,
  AdminActivitySummaryQueryDto,
  TrackActivityDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackActivity(userId: string | null, dto: TrackActivityDto) {
    return this.prisma.userActivity.create({
      data: {
        userId,
        action: dto.action.trim(),
        entityType: dto.entityType?.trim() || null,
        entityId: dto.entityId?.trim() || null,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        deviceInfo: dto.deviceInfo || null,
      },
    });
  }

  async getMyActivities(userId: string, query: ActivityQueryDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const where: any = { userId };
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.timestamp = {};
      if (query.from) where.timestamp.gte = new Date(query.from);
      if (query.to) where.timestamp.lte = new Date(query.to);
    }

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      activities,
      total,
      limit,
      offset,
      hasMore: offset + activities.length < total,
    };
  }

  async getAdminActivitySummary(query: AdminActivitySummaryQueryDto) {
    const now = new Date();
    const days = query.days ?? 7;
    const top = query.top ?? 10;

    const from = query.from
      ? new Date(query.from)
      : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : now;

    const [totalEvents, uniqueUsers, topActionsRaw, dailyRaw] =
      await Promise.all([
        this.prisma.userActivity.count({
          where: { timestamp: { gte: from, lte: to } },
        }),
        this.prisma.userActivity.findMany({
          where: {
            timestamp: { gte: from, lte: to },
            userId: { not: null },
          },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.userActivity.groupBy({
          by: ['action'],
          where: { timestamp: { gte: from, lte: to } },
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
      ]);

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      totalEvents,
      uniqueUsers: uniqueUsers.length,
      topActions: topActionsRaw.map((row) => ({
        action: row.action,
        count: row._count.action,
      })),
      daily: dailyRaw.map((row) => ({
        day: new Date(row.day).toISOString(),
        count: Number(row.count),
      })),
    };
  }
}
