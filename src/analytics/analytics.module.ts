import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminGuard } from '@/common/guards/admin.guard';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PrismaService, AdminGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
