import api from './api'

export interface Announcement {
  announcementId: string
  title: string
  content: string
  priority: string
  workspaceId: string | null
  authorId: string
  isPublished: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  author?: {
    userId: string
    fullName: string | null
  }
}

export interface CreateAnnouncementDto {
  title: string
  content: string
  priority?: string
  workspaceId?: string
  isPublished?: boolean
  expiresAt?: string
}

export interface UpdateAnnouncementDto {
  title?: string
  content?: string
  priority?: string
  isPublished?: boolean
  expiresAt?: string
}

export const announcementService = {
  async getAll(workspaceId?: string): Promise<Announcement[]> {
    const params = workspaceId ? { workspaceId } : {}
    const response = await api.get('/announcements', { params })
    return response.data
  },

  async getById(id: string): Promise<Announcement> {
    const response = await api.get(`/announcements/${id}`)
    return response.data
  },

  async create(data: CreateAnnouncementDto): Promise<Announcement> {
    const response = await api.post('/announcements', data)
    return response.data
  },

  async update(id: string, data: UpdateAnnouncementDto): Promise<Announcement> {
    const response = await api.patch(`/announcements/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/announcements/${id}`)
  },

  async publish(id: string): Promise<Announcement> {
    const response = await api.patch(`/announcements/${id}/publish`)
    return response.data
  },
}
