import api from './api'

export interface Watcher {
  watcherId: string
  taskId: string
  userId: string
  createdAt: string
  user?: {
    userId: string
    fullName: string | null
    profileImageUrl: string | null
  }
}

export const watcherService = {
  async getByTask(taskId: string): Promise<Watcher[]> {
    const response = await api.get(`/tasks/${taskId}/watchers`)
    return response.data
  },

  async add(taskId: string, userId: string): Promise<Watcher> {
    const response = await api.post(`/tasks/${taskId}/watchers`, { userId: parseInt(userId, 10) })
    return response.data
  },

  async remove(taskId: string, userId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/watchers/${userId}`)
  },
}
