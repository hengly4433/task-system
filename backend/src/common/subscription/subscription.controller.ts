import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { TenantRoleGuard, RequireTenantRole } from '../tenant';

@ApiTags('Subscription')
@Controller('subscription')
@ApiBearerAuth()
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly schedulerService: SubscriptionSchedulerService,
  ) {}

  @Get()
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Get subscription info for current tenant (Owner only)' })
  @ApiResponse({ status: 200, description: 'Subscription info returned' })
  @ApiResponse({ status: 403, description: 'Only tenant owners can view subscription info' })
  async getSubscriptionInfo() {
    return this.subscriptionService.getSubscriptionInfo();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get current usage stats' })
  @ApiResponse({ status: 200, description: 'Usage stats returned' })
  async getUsageStats() {
    const info = await this.subscriptionService.getSubscriptionInfo();
    return {
      plan: info?.plan || 'FREE',
      usage: info?.usage || { users: 0, projects: 0, tasks: 0 },
      limits: info?.limits || { maxUsers: 5, maxProjects: 3, maxTasks: 100 },
    };
  }

  @Get('features')
  @ApiOperation({ summary: 'Get available features for current plan' })
  @ApiResponse({ status: 200, description: 'Features returned' })
  async getFeatures() {
    const [customRoles, advancedReports, apiAccess, customBranding, prioritySupport, timeTracking] = await Promise.all([
      this.subscriptionService.hasFeature('customRoles'),
      this.subscriptionService.hasFeature('advancedReports'),
      this.subscriptionService.hasFeature('apiAccess'),
      this.subscriptionService.hasFeature('customBranding'),
      this.subscriptionService.hasFeature('prioritySupport'),
      this.subscriptionService.hasFeature('timeTracking'),
    ]);

    return {
      customRoles,
      advancedReports,
      apiAccess,
      customBranding,
      prioritySupport,
      timeTracking,
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get usage alerts for approaching limits (80%, 90%, 100%)' })
  @ApiResponse({ status: 200, description: 'Usage alerts returned' })
  async getUsageAlerts() {
    return this.subscriptionService.getUsageAlerts();
  }

  @Get('billing-history')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Get billing/payment history (Owner only)' })
  @ApiResponse({ status: 200, description: 'Billing history returned' })
  @ApiResponse({ status: 403, description: 'Only tenant owners can view billing history' })
  async getBillingHistory() {
    return this.subscriptionService.getBillingHistory();
  }

  @Get('trial-status')
  @ApiOperation({ summary: 'Get current trial status' })
  @ApiResponse({ status: 200, description: 'Trial status returned' })
  async getTrialStatus() {
    return this.subscriptionService.getTrialStatus();
  }

  @Post('start-trial')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Start a 7-day free trial for a paid plan (Owner only)' })
  @ApiResponse({ status: 201, description: 'Trial started successfully' })
  @ApiResponse({ status: 403, description: 'Cannot start trial - already on paid plan or already in trial' })
  async startTrial(@Body() body: { plan: string }) {
    return this.subscriptionService.startTrial(body.plan);
  }

  @Get('grace-period')
  @ApiOperation({ summary: 'Get grace period status for current tenant' })
  @ApiResponse({ status: 200, description: 'Grace period status returned' })
  async getGracePeriodStatus() {
    return this.subscriptionService.getGracePeriodStatus();
  }

  @Get('downgrade-impact/:targetPlan')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Preview impact of downgrading to a lower plan (Owner only)' })
  @ApiResponse({ status: 200, description: 'Downgrade impact analysis returned' })
  async getDowngradeImpact(@Param('targetPlan') targetPlan: string) {
    return this.subscriptionService.getPlanDowngradeImpact(targetPlan);
  }

  @Post('downgrade')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Downgrade to a lower plan (Owner only)' })
  @ApiResponse({ status: 200, description: 'Downgrade result returned' })
  @ApiResponse({ status: 400, description: 'Cannot downgrade - limits exceeded' })
  async applyDowngrade(@Body() body: { targetPlan: string; forceDowngrade?: boolean }) {
    return this.subscriptionService.validateAndApplyDowngrade(body.targetPlan, body.forceDowngrade);
  }

  @Get('sent-alerts')
  @ApiOperation({ summary: 'Get sent usage alerts history' })
  @ApiResponse({ status: 200, description: 'Sent alerts history returned' })
  async getSentAlerts() {
    return this.subscriptionService.getSentUsageAlerts();
  }

  @Post('check-alerts')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('ADMIN')
  @ApiOperation({ summary: 'Check and send usage alerts if thresholds are crossed (Admin+)' })
  @ApiResponse({ status: 200, description: 'Alerts checked and sent if needed' })
  async checkAndSendAlerts() {
    return this.subscriptionService.checkAndSendUsageAlerts();
  }

  @Post('reset-alerts')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Reset usage alerts (e.g., after upgrading plan) (Owner only)' })
  @ApiResponse({ status: 200, description: 'Alerts reset successfully' })
  async resetAlerts(@Body() body: { alertType?: string }) {
    await this.subscriptionService.resetUsageAlerts(body.alertType);
    return { success: true, message: 'Usage alerts reset successfully' };
  }

  @Post('run-expiry-check')
  @UseGuards(TenantRoleGuard)
  @RequireTenantRole('OWNER')
  @ApiOperation({ summary: 'Manually trigger subscription expiry check (Owner only)' })
  @ApiResponse({ status: 200, description: 'Expiry check completed' })
  async runExpiryCheck() {
    const result = await this.schedulerService.runExpiryCheckNow();
    return {
      message: 'Expiry check completed',
      ...result,
      scheduledRuns: {
        expiryCheck: 'Every day at midnight',
        usageAlerts: 'Every hour',
      },
    };
  }
}
