import api from './api'

export interface Label {
  labelId: string
  name: string
  color: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface CreateLabelDto {
  name: string
  color: string
  projectId: string
}

export interface UpdateLabelDto {
  name?: string
  color?: string
}

export const labelService = {
  async getByProject(projectId: string): Promise<Label[]> {
    const response = await api.get(`/projects/${projectId}/labels`)
    return response.data
  },

  async getById(id: string): Promise<Label> {
    const response = await api.get(`/labels/${id}`)
    return response.data
  },

  async create(data: CreateLabelDto): Promise<Label> {
    const response = await api.post('/labels', data)
    return response.data
  },

  async update(id: string, data: UpdateLabelDto): Promise<Label> {
    const response = await api.patch(`/labels/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/labels/${id}`)
  },

  async addToTask(taskId: string, labelId: string): Promise<void> {
    await api.post(`/tasks/${taskId}/labels/${labelId}`)
  },

  async removeFromTask(taskId: string, labelId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/labels/${labelId}`)
  },
}
