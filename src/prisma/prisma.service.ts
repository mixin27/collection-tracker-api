import 'dotenv/config';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL!;
    const pool = new PrismaPg({ connectionString: connectionString });
    super({
      adapter: pool,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');

      // Log queries in development
      if (process.env.NODE_ENV === 'development') {
        this.$on('query' as never, (e: any) => {
          this.logger.debug(`Query: ${e.query}`);
          this.logger.debug(`Duration: ${e.duration}ms`);
        });
      }

      // Log errors
      this.$on('error' as never, (e: any) => {
        this.logger.error(`Database error: ${e.message}`);
      });
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Clean up soft-deleted records older than specified days
   */
  async cleanupTombstones(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await Promise.all([
      this.collection.deleteMany({
        where: {
          isDeleted: true,
          deletedAt: {
            lt: cutoffDate,
          },
        },
      }),
      this.item.deleteMany({
        where: {
          isDeleted: true,
          deletedAt: {
            lt: cutoffDate,
          },
        },
      }),
      this.tag.deleteMany({
        where: {
          isDeleted: true,
          deletedAt: {
            lt: cutoffDate,
          },
        },
      }),
    ]);

    this.logger.log(
      `Cleaned up tombstones: ${results.reduce((sum, r) => sum + r.count, 0)} records deleted`,
    );

    return results;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const result = await this.deviceSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result;
  }
}
