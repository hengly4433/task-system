import api from './api'

export interface ActivityLog {
  logId: string
  action: string
  entityType: string
  entityId: string
  userId: string
  details: object | null
  createdAt: string
  user?: {
    userId: string
    fullName: string | null
    profileImageUrl: string | null
  }
}

export interface ActivityLogFilters {
  entityType?: string
  entityId?: string
  userId?: string
  page?: number
  pageSize?: number
}

export const activityLogService = {
  async getAll(filters?: ActivityLogFilters): Promise<{ data: ActivityLog[], total: number }> {
    const response = await api.get('/activity-logs', { params: filters })
    return response.data
  },

  async getByEntity(entityType: string, entityId: string): Promise<ActivityLog[]> {
    const response = await api.get('/activity-logs', {
      params: { entityType, entityId }
    })
    return response.data.data || response.data
  },

  async getByUser(userId: string): Promise<ActivityLog[]> {
    const response = await api.get('/activity-logs', {
      params: { userId }
    })
    return response.data.data || response.data
  },
}
