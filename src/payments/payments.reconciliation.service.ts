import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsReconciliationService {
  private readonly logger = new Logger(PaymentsReconciliationService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  // Daily at 03:15 UTC
  @Cron('15 3 * * *')
  async runDailyReconciliation() {
    const result = await this.paymentsService.reconcileActiveSubscriptions(300);
    this.logger.log(
      `Subscription reconciliation complete: processed=${result.processed}, updated=${result.updated}, failed=${result.failed}, usersSynced=${result.usersSynced}`,
    );
  }
}
