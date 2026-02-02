import api from './api'

export interface Checklist {
  checklistId: string
  taskId: string
  title: string
  position: number
  createdAt: string
  updatedAt: string
  items?: ChecklistItem[]
}

export interface ChecklistItem {
  itemId: string
  checklistId: string
  content: string
  isCompleted: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateChecklistDto {
  taskId: string
  title: string
}

export interface CreateChecklistItemDto {
  checklistId: string
  content: string
}

export const checklistService = {
  async getByTask(taskId: string): Promise<Checklist[]> {
    const response = await api.get(`/tasks/${taskId}/checklists`)
    return response.data
  },

  async create(data: CreateChecklistDto): Promise<Checklist> {
    const response = await api.post('/checklists', data)
    return response.data
  },

  async update(id: string, title: string): Promise<Checklist> {
    const response = await api.patch(`/checklists/${id}`, { title })
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/checklists/${id}`)
  },

  async addItem(data: CreateChecklistItemDto): Promise<ChecklistItem> {
    const response = await api.post('/checklists/items', data)
    return response.data
  },

  async updateItem(itemId: string, data: { content?: string, isCompleted?: boolean }): Promise<ChecklistItem> {
    const response = await api.patch(`/checklists/items/${itemId}`, data)
    return response.data
  },

  async toggleItem(itemId: string): Promise<ChecklistItem> {
    const response = await api.patch(`/checklists/items/${itemId}/toggle`)
    return response.data
  },

  async deleteItem(itemId: string): Promise<void> {
    await api.delete(`/checklists/items/${itemId}`)
  },
}
