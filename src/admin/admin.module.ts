import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { SubscriptionProfileService } from '@/subscription/subscription-profile.service';

@Module({
  controllers: [AdminController, AdminSubscriptionsController],
  providers: [AdminService, SubscriptionProfileService, PrismaService, AdminGuard],
})
export class AdminModule {}
