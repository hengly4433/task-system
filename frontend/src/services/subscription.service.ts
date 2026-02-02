import api from './api'

export interface SubscriptionInfo {
  plan: string
  status: string
  trialEndsAt: string | null
  limits: {
    maxUsers: number
    maxProjects: number
    maxTasks: number
    maxStorage: string
    maxFileSize: string
  }
  usage: {
    users: number
    projects: number
    tasks: number
    storage: string  // in bytes, as string for BigInt support
  }
  features: {
    customRoles: boolean
    advancedReports: boolean
    apiAccess: boolean
    customBranding: boolean
    prioritySupport: boolean
    timeTracking: boolean
    auditLogRetention: number
  }
}

export interface UsageStats {
  plan: string
  usage: {
    users: number
    projects: number
    tasks: number
  }
  limits: {
    maxUsers: number
    maxProjects: number
    maxTasks: number
  }
}

export interface PlanFeatures {
  customRoles: boolean
  advancedReports: boolean
  apiAccess: boolean
  customBranding: boolean
  prioritySupport: boolean
  timeTracking: boolean
}

export interface UsageAlert {
  type: 'users' | 'projects' | 'tasks' | 'storage'
  current: number
  limit: number
  percentage: number
  level: 'warning' | 'critical' | 'exceeded'
}

export interface TrialStatus {
  isOnTrial: boolean
  trialPlan: string | null
  trialEndsAt: string | null
  daysRemaining: number
}

export interface BillingHistoryItem {
  paymentId: string
  amount: number
  currency: string
  status: string
  paymentProvider: string
  plan: string
  createdAt: string
}

export interface GracePeriodStatus {
  isInGracePeriod: boolean
  gracePeriodEndsAt: string | null
  daysRemaining: number
  reason: 'trial_expired' | 'subscription_expired' | null
}

export interface DowngradeImpact {
  canDowngrade: boolean
  currentPlan: string
  targetPlan: string
  issues: Array<{
    type: 'users' | 'projects' | 'tasks' | 'storage'
    current: number
    newLimit: number
    excess: number
    message: string
  }>
  warnings: string[]
}

export interface DowngradeResult {
  success: boolean
  message: string
  appliedPlan: string | null
}

export interface SentAlert {
  alertType: string
  threshold: number
  percentage: number
  sentAt: string
}

export const subscriptionService = {
  async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    const response = await api.get('/subscription')
    return response.data
  },

  async getUsageStats(): Promise<UsageStats> {
    const response = await api.get('/subscription/usage')
    return response.data
  },

  async getFeatures(): Promise<PlanFeatures> {
    const response = await api.get('/subscription/features')
    return response.data
  },

  async getUsageAlerts(): Promise<UsageAlert[]> {
    const response = await api.get('/subscription/alerts')
    return response.data
  },

  async getTrialStatus(): Promise<TrialStatus> {
    const response = await api.get('/subscription/trial-status')
    return response.data
  },

  async startTrial(plan: string): Promise<{ trialEndsAt: string; plan: string }> {
    const response = await api.post('/subscription/start-trial', { plan })
    return response.data
  },

  async getBillingHistory(): Promise<BillingHistoryItem[]> {
    const response = await api.get('/subscription/billing-history')
    return response.data
  },

  // Grace Period
  async getGracePeriodStatus(): Promise<GracePeriodStatus> {
    const response = await api.get('/subscription/grace-period')
    return response.data
  },

  // Plan Downgrade
  async getDowngradeImpact(targetPlan: string): Promise<DowngradeImpact> {
    const response = await api.get(`/subscription/downgrade-impact/${targetPlan}`)
    return response.data
  },

  async applyDowngrade(targetPlan: string, forceDowngrade = false): Promise<DowngradeResult> {
    const response = await api.post('/subscription/downgrade', { targetPlan, forceDowngrade })
    return response.data
  },

  // Usage Alert Management
  async getSentAlerts(): Promise<SentAlert[]> {
    const response = await api.get('/subscription/sent-alerts')
    return response.data
  },

  async checkAndSendAlerts(): Promise<Array<{
    type: string
    threshold: number
    percentage: number
    sentViaEmail: boolean
    sentViaApp: boolean
  }>> {
    const response = await api.post('/subscription/check-alerts')
    return response.data
  },

  async resetAlerts(alertType?: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/subscription/reset-alerts', { alertType })
    return response.data
  },
}
