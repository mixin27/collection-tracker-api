import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionProfileService } from '@/subscription/subscription-profile.service';
import { PaymentsReconciliationService } from './payments.reconciliation.service';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsReconciliationService,
    SubscriptionProfileService,
    PrismaService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
