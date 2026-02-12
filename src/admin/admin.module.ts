import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { SubscriptionProfileService } from '@/subscription/subscription-profile.service';
import { AdminMetricsController } from './admin-metrics.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  controllers: [
    AdminController,
    AdminSubscriptionsController,
    AdminMetricsController,
    AdminUsersController,
  ],
  providers: [AdminService, SubscriptionProfileService, PrismaService, AdminGuard],
})
export class AdminModule {}
