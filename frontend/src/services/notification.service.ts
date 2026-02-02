import api from './api'

export interface Notification {
  notificationId: string
  notificationText: string
  userId?: string
  isRead: boolean
  entityType?: string
  entityId?: string
  createdAt: string
}

export interface NotificationFilters {
  isRead?: boolean
  page?: number
  pageSize?: number
}

export const notificationService = {
  async getAll(filters?: NotificationFilters): Promise<{ data: Notification[], total: number }> {
    const response = await api.get('/notifications', { params: filters })
    return response.data
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count')
    return response.data.count
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all')
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`)
  },

  async deleteAll(): Promise<void> {
    await api.delete('/notifications')
  },
}
