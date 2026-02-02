import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database';

/**
 * Scheduled jobs for subscription management:
 * 1. Detect expired trials and subscriptions → Start grace period
 * 2. Detect expired grace periods → Suspend tenant
 * 3. Check and send usage alerts
 */
@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every day at midnight to check for expired trials and subscriptions.
   * Cron: 0 0 * * * (every day at 00:00)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions(): Promise<void> {
    this.logger.log('Running subscription expiry check...');
    
    const now = new Date();

    try {
      // 1. Find tenants with expired TRIALS (not already in grace period)
      const expiredTrials = await this.prisma.tenant.findMany({
        where: {
          status: 'TRIAL',
          trialEndsAt: {
            lt: now,
          },
          deletedAt: null,
        },
      });

      for (const tenant of expiredTrials) {
        await this.startGracePeriodForTenant(tenant.tenantId, 'trial_expired');
      }

      if (expiredTrials.length > 0) {
        this.logger.log(`Started grace period for ${expiredTrials.length} expired trial(s)`);
      }

      // 2. Find tenants with expired SUBSCRIPTIONS (paid plans, not in grace period)
      const expiredSubscriptions = await this.prisma.tenant.findMany({
        where: {
          status: 'ACTIVE',
          plan: {
            in: ['STARTER', 'PRO', 'ENTERPRISE'],
          },
          subscriptionEndsAt: {
            lt: now,
          },
          deletedAt: null,
        },
      });

      for (const tenant of expiredSubscriptions) {
        await this.startGracePeriodForTenant(tenant.tenantId, 'subscription_expired');
      }

      if (expiredSubscriptions.length > 0) {
        this.logger.log(`Started grace period for ${expiredSubscriptions.length} expired subscription(s)`);
      }

      // 3. Find tenants with expired GRACE PERIOD → Suspend
      const expiredGracePeriods = await this.prisma.tenant.findMany({
        where: {
          status: 'GRACE_PERIOD',
          gracePeriodEndsAt: {
            lt: now,
          },
          deletedAt: null,
        },
      });

      for (const tenant of expiredGracePeriods) {
        await this.suspendTenant(tenant.tenantId);
      }

      if (expiredGracePeriods.length > 0) {
        this.logger.log(`Suspended ${expiredGracePeriods.length} tenant(s) with expired grace period`);
      }

    } catch (error) {
      this.logger.error('Error checking subscription expiry:', error);
    }
  }

  /**
   * Start grace period for a tenant.
   */
  private async startGracePeriodForTenant(
    tenantId: bigint,
    reason: 'trial_expired' | 'subscription_expired',
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) return;

    const gracePeriodDays = tenant.gracePeriodDays || 3;
    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + gracePeriodDays);

    await this.prisma.tenant.update({
      where: { tenantId },
      data: {
        status: 'GRACE_PERIOD',
        gracePeriodEndsAt,
      },
    });

    this.logger.log(
      `Tenant ${tenantId}: Started ${gracePeriodDays}-day grace period (${reason}). Ends: ${gracePeriodEndsAt.toISOString()}`,
    );

    // TODO: Send email notification to billing email about grace period
  }

  /**
   * Suspend a tenant after grace period expires.
   */
  private async suspendTenant(tenantId: bigint): Promise<void> {
    await this.prisma.tenant.update({
      where: { tenantId },
      data: {
        status: 'SUSPENDED',
      },
    });

    this.logger.log(`Tenant ${tenantId}: Suspended due to expired grace period`);

    // TODO: Send email notification about suspension
  }

  /**
   * Run every hour to check and send usage alerts.
   * Cron: 0 * * * * (every hour at minute 0)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleUsageAlerts(): Promise<void> {
    this.logger.debug('Running hourly usage alert check...');

    try {
      // Get all active tenants
      const tenants = await this.prisma.tenant.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'TRIAL', 'GRACE_PERIOD'],
          },
          deletedAt: null,
        },
      });

      for (const tenant of tenants) {
        await this.checkAndSendAlertsForTenant(tenant.tenantId);
      }
    } catch (error) {
      this.logger.error('Error checking usage alerts:', error);
    }
  }

  /**
   * Check usage and send alerts for a specific tenant.
   */
  private async checkAndSendAlertsForTenant(tenantId: bigint): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) return;

    // Get current usage
    const [userCount, projectCount, taskCount] = await Promise.all([
      this.prisma.tenantMember.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.task.count({
        where: {
          project: { tenantId },
          deletedAt: null,
        },
      }),
    ]);

    // Plan limits (simplified - in production use getPlanLimits)
    const planLimits: Record<string, { maxUsers: number; maxProjects: number; maxTasks: number }> = {
      FREE: { maxUsers: 5, maxProjects: 3, maxTasks: 100 },
      STARTER: { maxUsers: 15, maxProjects: 20, maxTasks: 1000 },
      PRO: { maxUsers: 50, maxProjects: 100, maxTasks: 10000 },
      ENTERPRISE: { maxUsers: 99999, maxProjects: 99999, maxTasks: 99999 },
    };

    const limits = planLimits[tenant.plan] || planLimits.FREE;
    const thresholds = [80, 90, 100];

    const checks = [
      { type: 'users', current: userCount, limit: tenant.maxUsers || limits.maxUsers },
      { type: 'projects', current: projectCount, limit: tenant.maxProjects || limits.maxProjects },
      { type: 'tasks', current: taskCount, limit: limits.maxTasks },
    ];

    for (const check of checks) {
      const percentage = Math.round((check.current / check.limit) * 100);

      for (const threshold of thresholds) {
        if (percentage >= threshold) {
          // Check if alert already sent
          const existingAlert = await this.prisma.usageAlert.findUnique({
            where: {
              tenantId_alertType_threshold: {
                tenantId,
                alertType: check.type,
                threshold,
              },
            },
          });

          if (!existingAlert) {
            // Create alert record
            await this.prisma.usageAlert.create({
              data: {
                tenantId,
                alertType: check.type,
                threshold,
                percentage,
                sentViaEmail: true,
                sentViaApp: true,
              },
            });

            this.logger.log(
              `Tenant ${tenantId}: Sent ${threshold}% usage alert for ${check.type} (current: ${percentage}%)`,
            );

            // TODO: Send email notification about usage threshold
            // TODO: Create in-app notification
          }
        }
      }
    }
  }

  /**
   * Manual trigger to process all expiry checks immediately.
   * Useful for testing or after system downtime.
   */
  async runExpiryCheckNow(): Promise<{
    expiredTrials: number;
    expiredSubscriptions: number;
    expiredGracePeriods: number;
  }> {
    this.logger.log('Running manual expiry check...');
    
    const now = new Date();

    // Count before processing
    const expiredTrials = await this.prisma.tenant.count({
      where: {
        status: 'TRIAL',
        trialEndsAt: { lt: now },
        deletedAt: null,
      },
    });

    const expiredSubscriptions = await this.prisma.tenant.count({
      where: {
        status: 'ACTIVE',
        plan: { in: ['STARTER', 'PRO', 'ENTERPRISE'] },
        subscriptionEndsAt: { lt: now },
        deletedAt: null,
      },
    });

    const expiredGracePeriods = await this.prisma.tenant.count({
      where: {
        status: 'GRACE_PERIOD',
        gracePeriodEndsAt: { lt: now },
        deletedAt: null,
      },
    });

    // Run the check
    await this.handleExpiredSubscriptions();

    return {
      expiredTrials,
      expiredSubscriptions,
      expiredGracePeriods,
    };
  }
}
