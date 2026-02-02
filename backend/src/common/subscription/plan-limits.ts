/**
 * Subscription plan limits configuration.
 * 
 * These limits are applied based on the tenant's plan field.
 * The defaults here can be overridden by the values stored in the tenant record.
 */
export interface PlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxTasks: number;
  maxStorage: bigint;  // in bytes
  maxFileSize: bigint; // max size per file in bytes
  trialDays: number;   // number of trial days (0 for FREE)
  features: {
    customRoles: boolean;
    advancedReports: boolean;
    apiAccess: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    timeTracking: boolean;
    auditLogRetention: number; // days to retain audit logs
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxUsers: 5,
    maxProjects: 3,
    maxTasks: 100,
    maxStorage: BigInt(524288000),  // 500 MB
    maxFileSize: BigInt(10485760),  // 10 MB
    trialDays: 0,
    features: {
      customRoles: false,
      advancedReports: false,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
      timeTracking: false,
      auditLogRetention: 7,
    },
  },
  STARTER: {
    maxUsers: 15,
    maxProjects: 20,
    maxTasks: 1000,
    maxStorage: BigInt(5368709120),  // 5 GB
    maxFileSize: BigInt(26214400),  // 25 MB
    trialDays: 7,
    features: {
      customRoles: true,
      advancedReports: false,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
      timeTracking: true,
      auditLogRetention: 30,
    },
  },
  PRO: {
    maxUsers: 50,
    maxProjects: 100,
    maxTasks: 10000,
    maxStorage: BigInt(26843545600),  // 25 GB
    maxFileSize: BigInt(52428800),  // 50 MB
    trialDays: 7,
    features: {
      customRoles: true,
      advancedReports: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: false,
      timeTracking: true,
      auditLogRetention: 90,
    },
  },
  ENTERPRISE: {
    maxUsers: 99999,
    maxProjects: 99999,
    maxTasks: 99999,
    maxStorage: BigInt(107374182400),  // 100 GB
    maxFileSize: BigInt(104857600),  // 100 MB
    trialDays: 7,
    features: {
      customRoles: true,
      advancedReports: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
      timeTracking: true,
      auditLogRetention: 365,
    },
  },
};

/**
 * Get the limits for a given plan, falling back to FREE if unknown.
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}
