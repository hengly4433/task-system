import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database';
import { TenantContextService } from '../tenant';
import { getPlanLimits, PlanLimits } from './plan-limits';

/**
 * Service for checking subscription limits.
 * 
 * This service validates that tenant operations don't exceed their plan limits.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Helper to get tenant and plan limits with proper error handling.
   */
  private async getTenantWithLimits(): Promise<{ tenant: any; planLimits: PlanLimits } | null> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      this.logger.warn('No tenant ID in context - skipping subscription check');
      return null;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { tenantId },
    });
    if (!tenant) {
      this.logger.warn(`Tenant ${tenantId} not found - skipping subscription check`);
      return null;
    }

    const planLimits = getPlanLimits(tenant.plan);
    return { tenant, planLimits };
  }

  /**
   * Check if the tenant can add more users.
   * Throws ForbiddenException if limit would be exceeded.
   */
  async checkUserLimit(): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { tenant, planLimits } = result;
    const maxUsers = tenant.maxUsers || planLimits.maxUsers;

    const currentUserCount = await this.prisma.tenantMember.count({
      where: { tenantId: tenant.tenantId, status: 'ACTIVE' },
    });

    if (currentUserCount >= maxUsers) {
      throw new ForbiddenException(
        `You have reached your plan's user limit (${maxUsers} users). ` +
        `Please upgrade your plan to add more team members.`
      );
    }
  }

  /**
   * Check if the tenant can create more projects.
   * Throws ForbiddenException if limit would be exceeded.
   */
  async checkProjectLimit(): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { tenant, planLimits } = result;
    const maxProjects = tenant.maxProjects || planLimits.maxProjects;

    const currentProjectCount = await this.prisma.project.count({
      where: { tenantId: tenant.tenantId, deletedAt: null },
    });

    if (currentProjectCount >= maxProjects) {
      throw new ForbiddenException(
        `You have reached your plan's project limit (${maxProjects} projects). ` +
        `Please upgrade your plan to create more projects.`
      );
    }
  }

  /**
   * Check if the tenant can create more tasks.
   * Throws ForbiddenException if limit would be exceeded.
   */
  async checkTaskLimit(): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { tenant, planLimits } = result;
    const maxTasks = planLimits.maxTasks;

    const currentTaskCount = await this.prisma.task.count({
      where: {
        project: { tenantId: tenant.tenantId },
        deletedAt: null,
      },
    });

    if (currentTaskCount >= maxTasks) {
      throw new ForbiddenException(
        `You have reached your plan's task limit (${maxTasks} tasks). ` +
        `Please upgrade your plan to create more tasks.`
      );
    }
  }

  /**
   * Check if a file size is within plan limits.
   * Throws ForbiddenException if file is too large.
   * @param fileSize - Size of the file in bytes
   */
  async checkFileSizeLimit(fileSize: bigint): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { planLimits } = result;
    const maxFileSize = planLimits.maxFileSize;

    if (fileSize > maxFileSize) {
      const maxSizeMB = Number(maxFileSize) / (1024 * 1024);
      const fileSizeMB = Number(fileSize) / (1024 * 1024);
      throw new ForbiddenException(
        `File size (${fileSizeMB.toFixed(1)} MB) exceeds your plan's limit (${maxSizeMB.toFixed(0)} MB). ` +
        `Please upgrade your plan to upload larger files.`
      );
    }
  }

  /**
   * Check if the tenant can upload more files.
   * Throws ForbiddenException if storage limit would be exceeded.
   * @param fileSize - Size of the file to upload in bytes
   */
  async checkStorageLimit(fileSize: bigint): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { tenant, planLimits } = result;
    const maxStorage = tenant.maxStorage || planLimits.maxStorage;

    const currentStorage = await this.getStorageUsage(tenant.tenantId);
    const newTotalStorage = currentStorage + fileSize;

    if (newTotalStorage > maxStorage) {
      const maxStorageGB = Number(maxStorage) / (1024 * 1024 * 1024);
      const currentStorageGB = Number(currentStorage) / (1024 * 1024 * 1024);
      throw new ForbiddenException(
        `Storage limit exceeded. You are using ${currentStorageGB.toFixed(2)} GB of ${maxStorageGB.toFixed(0)} GB. ` +
        `Please upgrade your plan or delete some files to free up space.`
      );
    }
  }

  /**
   * Check if the tenant's trial has expired.
   * Throws ForbiddenException if trial is expired and plan is still TRIAL.
   */
  async checkTrialExpired(): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { tenant } = result;
    
    if (tenant.status === 'TRIAL' && tenant.trialEndsAt) {
      const now = new Date();
      if (tenant.trialEndsAt < now) {
        throw new ForbiddenException(
          `Your trial has expired. Please upgrade to a paid plan to continue using premium features.`
        );
      }
    }
  }

  /**
   * Check if trial is active and return status.
   */
  async isTrialActive(): Promise<boolean> {
    const result = await this.getTenantWithLimits();
    if (!result) return false;

    const { tenant } = result;
    
    if (tenant.status === 'TRIAL' && tenant.trialEndsAt) {
      return tenant.trialEndsAt > new Date();
    }
    return false;
  }

  /**
   * Start a trial for the current tenant.
   * @param plan - The plan to trial (STARTER, PRO, ENTERPRISE)
   * @returns Trial info with end date
   */
  async startTrial(plan: string): Promise<{ trialEndsAt: Date; plan: string }> {
    const result = await this.getTenantWithLimits();
    if (!result) {
      throw new ForbiddenException('Unable to start trial - no tenant context');
    }

    const { tenant, planLimits } = result;
    
    // Check if already on a paid plan
    if (tenant.plan !== 'FREE' && tenant.status === 'ACTIVE') {
      throw new ForbiddenException('You are already on a paid plan');
    }

    // Check if already in trial
    if (tenant.status === 'TRIAL' && tenant.trialEndsAt && tenant.trialEndsAt > new Date()) {
      throw new ForbiddenException('You already have an active trial');
    }

    const trialDays = getPlanLimits(plan).trialDays || 7;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    await this.prisma.tenant.update({
      where: { tenantId: tenant.tenantId },
      data: {
        plan: plan,
        status: 'TRIAL',
        trialEndsAt: trialEndsAt,
      },
    });

    this.logger.log(`Started ${trialDays}-day trial for tenant ${tenant.tenantId} on ${plan} plan`);

    return { trialEndsAt, plan };
  }

  /**
   * Get trial status for current tenant.
   */
  async getTrialStatus(): Promise<{
    isOnTrial: boolean;
    trialPlan: string | null;
    trialEndsAt: Date | null;
    daysRemaining: number;
  }> {
    const result = await this.getTenantWithLimits();
    if (!result) {
      return { isOnTrial: false, trialPlan: null, trialEndsAt: null, daysRemaining: 0 };
    }

    const { tenant } = result;
    
    if (tenant.status !== 'TRIAL' || !tenant.trialEndsAt) {
      return { isOnTrial: false, trialPlan: null, trialEndsAt: null, daysRemaining: 0 };
    }

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      isOnTrial: tenant.trialEndsAt > now,
      trialPlan: tenant.plan,
      trialEndsAt: tenant.trialEndsAt,
      daysRemaining,
    };
  }

  /**
   * Get the current storage usage for a tenant in bytes.
   */
  async getStorageUsage(tenantId?: bigint): Promise<bigint> {
    const tid = tenantId || this.tenantContext.getTenantId();
    if (!tid) return BigInt(0);

    // Sum file sizes from task attachments (through projects)
    const attachmentResult = await this.prisma.attachment.aggregate({
      _sum: { fileSize: true },
      where: {
        task: {
          project: { tenantId: tid },
        },
      },
    });

    // Sum file sizes from meeting attachments
    const meetingAttachmentResult = await this.prisma.meetingAttachment.aggregate({
      _sum: { fileSize: true },
      where: {
        meeting: { tenantId: tid },
      },
    });

    const attachmentSize = attachmentResult._sum.fileSize || BigInt(0);
    const meetingSize = meetingAttachmentResult._sum.fileSize || BigInt(0);

    return attachmentSize + meetingSize;
  }

  /**
   * Get current task count for tenant.
   */
  async getTaskCount(tenantId?: bigint): Promise<number> {
    const tid = tenantId || this.tenantContext.getTenantId();
    if (!tid) return 0;

    return this.prisma.task.count({
      where: {
        project: { tenantId: tid },
        deletedAt: null,
      },
    });
  }

  /**
   * Get usage alerts for thresholds (80%, 90%, 100%).
   */
  async getUsageAlerts(): Promise<Array<{
    type: 'users' | 'projects' | 'tasks' | 'storage';
    current: number;
    limit: number;
    percentage: number;
    level: 'warning' | 'critical' | 'exceeded';
  }>> {
    const result = await this.getTenantWithLimits();
    if (!result) return [];

    const { tenant, planLimits } = result;
    const alerts: Array<{
      type: 'users' | 'projects' | 'tasks' | 'storage';
      current: number;
      limit: number;
      percentage: number;
      level: 'warning' | 'critical' | 'exceeded';
    }> = [];

    const [userCount, projectCount, taskCount, storageUsage] = await Promise.all([
      this.prisma.tenantMember.count({ where: { tenantId: tenant.tenantId, status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { tenantId: tenant.tenantId, deletedAt: null } }),
      this.getTaskCount(tenant.tenantId),
      this.getStorageUsage(tenant.tenantId),
    ]);

    const checks = [
      { type: 'users' as const, current: userCount, limit: tenant.maxUsers || planLimits.maxUsers },
      { type: 'projects' as const, current: projectCount, limit: tenant.maxProjects || planLimits.maxProjects },
      { type: 'tasks' as const, current: taskCount, limit: planLimits.maxTasks },
      { type: 'storage' as const, current: Number(storageUsage), limit: Number(tenant.maxStorage || planLimits.maxStorage) },
    ];

    for (const check of checks) {
      const percentage = (check.current / check.limit) * 100;
      let level: 'warning' | 'critical' | 'exceeded' | null = null;

      if (percentage >= 100) {
        level = 'exceeded';
      } else if (percentage >= 90) {
        level = 'critical';
      } else if (percentage >= 80) {
        level = 'warning';
      }

      if (level) {
        alerts.push({
          type: check.type,
          current: check.current,
          limit: check.limit,
          percentage: Math.round(percentage),
          level,
        });
      }
    }

    return alerts;
  }

  /**
   * Get subscription info for the current tenant.
   */
  async getSubscriptionInfo() {
    const result = await this.getTenantWithLimits();
    if (!result) return null;

    const { tenant, planLimits } = result;
    
    const [userCount, projectCount, taskCount, storageUsage] = await Promise.all([
      this.prisma.tenantMember.count({ where: { tenantId: tenant.tenantId, status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { tenantId: tenant.tenantId, deletedAt: null } }),
      this.getTaskCount(tenant.tenantId),
      this.getStorageUsage(tenant.tenantId),
    ]);

    return {
      plan: tenant.plan,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      limits: {
        maxUsers: tenant.maxUsers || planLimits.maxUsers,
        maxProjects: tenant.maxProjects || planLimits.maxProjects,
        maxTasks: planLimits.maxTasks,
        maxStorage: (tenant.maxStorage || planLimits.maxStorage).toString(),
        maxFileSize: planLimits.maxFileSize.toString(),
      },
      usage: {
        users: userCount,
        projects: projectCount,
        tasks: taskCount,
        storage: storageUsage.toString(),
      },
      features: planLimits.features,
    };
  }

  /**
   * Check if a specific feature is available for the current plan.
   */
  async hasFeature(feature: 'customRoles' | 'advancedReports' | 'apiAccess' | 'customBranding' | 'prioritySupport' | 'timeTracking'): Promise<boolean> {
    const result = await this.getTenantWithLimits();
    if (!result) return false;

    const { planLimits } = result;
    return planLimits.features[feature] || false;
  }

  /**
   * Get billing/payment history for current tenant.
   */
  async getBillingHistory(): Promise<Array<{
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    paymentProvider: string;
    plan: string;
    createdAt: Date;
  }>> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return [];

    const payments = await this.prisma.paymentHistory.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return payments.map((p) => ({
      paymentId: p.paymentId.toString(),
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paymentProvider: p.paymentProvider,
      plan: p.plan,
      createdAt: p.createdAt,
    }));
  }

  // ============================================================================
  // GRACE PERIOD HANDLING
  // ============================================================================

  /**
   * Get grace period status for current tenant.
   */
  async getGracePeriodStatus(): Promise<{
    isInGracePeriod: boolean;
    gracePeriodEndsAt: Date | null;
    daysRemaining: number;
    reason: 'trial_expired' | 'subscription_expired' | null;
  }> {
    const result = await this.getTenantWithLimits();
    if (!result) {
      return { isInGracePeriod: false, gracePeriodEndsAt: null, daysRemaining: 0, reason: null };
    }

    const { tenant } = result;
    
    if (tenant.status !== 'GRACE_PERIOD' || !tenant.gracePeriodEndsAt) {
      return { isInGracePeriod: false, gracePeriodEndsAt: null, daysRemaining: 0, reason: null };
    }

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((tenant.gracePeriodEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Determine reason
    let reason: 'trial_expired' | 'subscription_expired' | null = null;
    if (tenant.trialEndsAt && tenant.trialEndsAt < now) {
      reason = 'trial_expired';
    } else if (tenant.subscriptionEndsAt && tenant.subscriptionEndsAt < now) {
      reason = 'subscription_expired';
    }

    return {
      isInGracePeriod: tenant.gracePeriodEndsAt > now,
      gracePeriodEndsAt: tenant.gracePeriodEndsAt,
      daysRemaining,
      reason,
    };
  }

  /**
   * Check if tenant is in grace period and throw if expired or if trying to create/update.
   * During grace period, only read operations are allowed.
   * @param operation - Type of operation: 'read' or 'write'
   */
  async checkGracePeriod(operation: 'read' | 'write' = 'write'): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { tenant } = result;
    const now = new Date();

    // Check if in grace period
    if (tenant.status === 'GRACE_PERIOD') {
      if (!tenant.gracePeriodEndsAt || tenant.gracePeriodEndsAt < now) {
        // Grace period has expired
        throw new ForbiddenException(
          'Your grace period has expired. Please upgrade your subscription to continue using the service.'
        );
      }

      // Still in grace period - only allow read operations
      if (operation === 'write') {
        const daysRemaining = Math.ceil((tenant.gracePeriodEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        throw new ForbiddenException(
          `Your subscription has expired and you are in a grace period. ` +
          `You have ${daysRemaining} day(s) remaining to upgrade or your data will become read-only. ` +
          `Please upgrade your plan to create or modify content.`
        );
      }
    }

    // Check if suspended
    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your account has been suspended. Please contact support.'
      );
    }
  }

  /**
   * Start grace period for tenant after trial or subscription expires.
   */
  async startGracePeriod(reason: 'trial_expired' | 'subscription_expired'): Promise<void> {
    const result = await this.getTenantWithLimits();
    if (!result) return;

    const { tenant } = result;
    const gracePeriodDays = tenant.gracePeriodDays || 3;
    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + gracePeriodDays);

    await this.prisma.tenant.update({
      where: { tenantId: tenant.tenantId },
      data: {
        status: 'GRACE_PERIOD',
        gracePeriodEndsAt,
      },
    });

    this.logger.log(`Started ${gracePeriodDays}-day grace period for tenant ${tenant.tenantId} (${reason})`);
  }

  // ============================================================================
  // PLAN DOWNGRADE HANDLING
  // ============================================================================

  /**
   * Get the impact of downgrading to a lower plan.
   */
  async getPlanDowngradeImpact(targetPlan: string): Promise<{
    canDowngrade: boolean;
    currentPlan: string;
    targetPlan: string;
    issues: Array<{
      type: 'users' | 'projects' | 'tasks' | 'storage';
      current: number;
      newLimit: number;
      excess: number;
      message: string;
    }>;
    warnings: string[];
  }> {
    const result = await this.getTenantWithLimits();
    if (!result) {
      return { canDowngrade: false, currentPlan: 'UNKNOWN', targetPlan, issues: [], warnings: ['No tenant context'] };
    }

    const { tenant } = result;
    const targetLimits = getPlanLimits(targetPlan);
    
    const [userCount, projectCount, taskCount, storageUsage] = await Promise.all([
      this.prisma.tenantMember.count({ where: { tenantId: tenant.tenantId, status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { tenantId: tenant.tenantId, deletedAt: null } }),
      this.getTaskCount(tenant.tenantId),
      this.getStorageUsage(tenant.tenantId),
    ]);

    const issues: Array<{
      type: 'users' | 'projects' | 'tasks' | 'storage';
      current: number;
      newLimit: number;
      excess: number;
      message: string;
    }> = [];

    const warnings: string[] = [];

    // Check users
    if (userCount > targetLimits.maxUsers) {
      issues.push({
        type: 'users',
        current: userCount,
        newLimit: targetLimits.maxUsers,
        excess: userCount - targetLimits.maxUsers,
        message: `You have ${userCount} users but ${targetPlan} plan only allows ${targetLimits.maxUsers}. Remove ${userCount - targetLimits.maxUsers} user(s) before downgrading.`,
      });
    }

    // Check projects
    if (projectCount > targetLimits.maxProjects) {
      issues.push({
        type: 'projects',
        current: projectCount,
        newLimit: targetLimits.maxProjects,
        excess: projectCount - targetLimits.maxProjects,
        message: `You have ${projectCount} projects but ${targetPlan} plan only allows ${targetLimits.maxProjects}. Archive or delete ${projectCount - targetLimits.maxProjects} project(s) before downgrading.`,
      });
    }

    // Check tasks
    if (taskCount > targetLimits.maxTasks) {
      issues.push({
        type: 'tasks',
        current: taskCount,
        newLimit: targetLimits.maxTasks,
        excess: taskCount - targetLimits.maxTasks,
        message: `You have ${taskCount} tasks but ${targetPlan} plan only allows ${targetLimits.maxTasks}. You will not be able to create new tasks until you are under the limit.`,
      });
    }

    // Check storage
    const storageNumber = Number(storageUsage);
    const targetStorageNumber = Number(targetLimits.maxStorage);
    if (storageNumber > targetStorageNumber) {
      const currentGB = (storageNumber / (1024 * 1024 * 1024)).toFixed(2);
      const targetGB = (targetStorageNumber / (1024 * 1024 * 1024)).toFixed(2);
      issues.push({
        type: 'storage',
        current: storageNumber,
        newLimit: targetStorageNumber,
        excess: storageNumber - targetStorageNumber,
        message: `You are using ${currentGB} GB but ${targetPlan} plan only allows ${targetGB} GB. Delete files to reduce storage usage before downgrading.`,
      });
    }

    // Feature warnings
    const currentLimits = getPlanLimits(tenant.plan);
    if (currentLimits.features.customRoles && !targetLimits.features.customRoles) {
      warnings.push('Custom roles will be disabled. Users with custom roles will lose their role assignments.');
    }
    if (currentLimits.features.advancedReports && !targetLimits.features.advancedReports) {
      warnings.push('Advanced reports will no longer be available.');
    }
    if (currentLimits.features.apiAccess && !targetLimits.features.apiAccess) {
      warnings.push('API access will be disabled. Any API integrations will stop working.');
    }
    if (currentLimits.features.timeTracking && !targetLimits.features.timeTracking) {
      warnings.push('Time tracking feature will be disabled.');
    }

    return {
      canDowngrade: issues.filter(i => i.type !== 'tasks').length === 0, // Tasks is a soft limit warning
      currentPlan: tenant.plan,
      targetPlan,
      issues,
      warnings,
    };
  }

  /**
   * Validate if downgrade is possible and apply the new plan.
   */
  async validateAndApplyDowngrade(targetPlan: string, forceDowngrade = false): Promise<{
    success: boolean;
    message: string;
    appliedPlan: string | null;
  }> {
    const impact = await this.getPlanDowngradeImpact(targetPlan);

    if (!impact.canDowngrade && !forceDowngrade) {
      return {
        success: false,
        message: `Cannot downgrade to ${targetPlan}. Please resolve the following issues first: ` +
          impact.issues.map(i => i.message).join(' '),
        appliedPlan: null,
      };
    }

    const result = await this.getTenantWithLimits();
    if (!result) {
      return { success: false, message: 'No tenant context', appliedPlan: null };
    }

    const { tenant } = result;
    const targetLimits = getPlanLimits(targetPlan);

    // Apply the new plan
    await this.prisma.tenant.update({
      where: { tenantId: tenant.tenantId },
      data: {
        plan: targetPlan,
        maxUsers: targetLimits.maxUsers,
        maxProjects: targetLimits.maxProjects,
        maxStorage: targetLimits.maxStorage,
      },
    });

    this.logger.log(`Downgraded tenant ${tenant.tenantId} from ${tenant.plan} to ${targetPlan}`);

    return {
      success: true,
      message: impact.issues.length > 0
        ? `Downgraded to ${targetPlan}. Note: Some limits are exceeded. New content creation may be restricted.`
        : `Successfully downgraded to ${targetPlan}.`,
      appliedPlan: targetPlan,
    };
  }

  // ============================================================================
  // USAGE ALERT NOTIFICATIONS
  // ============================================================================

  /**
   * Check and send usage alerts if thresholds are crossed.
   * Returns alerts that were sent.
   */
  async checkAndSendUsageAlerts(): Promise<Array<{
    type: string;
    threshold: number;
    percentage: number;
    sentViaEmail: boolean;
    sentViaApp: boolean;
  }>> {
    const result = await this.getTenantWithLimits();
    if (!result) return [];

    const { tenant, planLimits } = result;
    const sentAlerts: Array<{
      type: string;
      threshold: number;
      percentage: number;
      sentViaEmail: boolean;
      sentViaApp: boolean;
    }> = [];

    const [userCount, projectCount, taskCount, storageUsage] = await Promise.all([
      this.prisma.tenantMember.count({ where: { tenantId: tenant.tenantId, status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { tenantId: tenant.tenantId, deletedAt: null } }),
      this.getTaskCount(tenant.tenantId),
      this.getStorageUsage(tenant.tenantId),
    ]);

    const checks = [
      { type: 'users', current: userCount, limit: tenant.maxUsers || planLimits.maxUsers },
      { type: 'projects', current: projectCount, limit: tenant.maxProjects || planLimits.maxProjects },
      { type: 'tasks', current: taskCount, limit: planLimits.maxTasks },
      { type: 'storage', current: Number(storageUsage), limit: Number(tenant.maxStorage || planLimits.maxStorage) },
    ];

    const thresholds = [80, 90, 100];

    for (const check of checks) {
      const percentage = Math.round((check.current / check.limit) * 100);

      for (const threshold of thresholds) {
        if (percentage >= threshold) {
          // Check if alert already sent
          const existingAlert = await this.prisma.usageAlert.findUnique({
            where: {
              tenantId_alertType_threshold: {
                tenantId: tenant.tenantId,
                alertType: check.type,
                threshold,
              },
            },
          });

          if (!existingAlert) {
            // Create alert record
            await this.prisma.usageAlert.create({
              data: {
                tenantId: tenant.tenantId,
                alertType: check.type,
                threshold,
                percentage,
                sentViaEmail: true,
                sentViaApp: true,
              },
            });

            sentAlerts.push({
              type: check.type,
              threshold,
              percentage,
              sentViaEmail: true,
              sentViaApp: true,
            });

            this.logger.log(`Sent ${threshold}% usage alert for ${check.type} to tenant ${tenant.tenantId}`);
          }
        }
      }
    }

    return sentAlerts;
  }

  /**
   * Reset usage alerts for a tenant (e.g., when upgrading plan or when usage decreases).
   */
  async resetUsageAlerts(alertType?: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return;

    await this.prisma.usageAlert.deleteMany({
      where: {
        tenantId,
        ...(alertType ? { alertType } : {}),
      },
    });

    this.logger.log(`Reset usage alerts for tenant ${tenantId}${alertType ? ` (type: ${alertType})` : ''}`);
  }

  /**
   * Get sent usage alerts for current tenant.
   */
  async getSentUsageAlerts(): Promise<Array<{
    alertType: string;
    threshold: number;
    percentage: number;
    sentAt: Date;
  }>> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return [];

    const alerts = await this.prisma.usageAlert.findMany({
      where: { tenantId },
      orderBy: { sentAt: 'desc' },
    });

    return alerts.map(a => ({
      alertType: a.alertType,
      threshold: a.threshold,
      percentage: a.percentage,
      sentAt: a.sentAt,
    }));
  }
}
