import { Module, Global } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';

/**
 * Global module providing subscription management services.
 * Includes scheduled jobs for automatic expiry detection.
 */
@Global()
@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionSchedulerService],
  exports: [SubscriptionService, SubscriptionSchedulerService],
})
export class SubscriptionModule {}
