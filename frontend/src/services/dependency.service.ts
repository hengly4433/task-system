import api from './api'

export interface Dependency {
  dependencyId: string
  taskId: string
  dependsOnTaskId: string
  type: string
  createdAt: string
  task?: {
    taskId: string
    title: string
  }
  dependsOnTask?: {
    taskId: string
    title: string
  }
}

export interface CreateDependencyDto {
  taskId: string
  dependsOnTaskId: string
  type?: string
}

export const dependencyService = {
  async getByTask(taskId: string): Promise<Dependency[]> {
    const response = await api.get(`/tasks/${taskId}/dependencies`)
    return response.data
  },

  async create(data: CreateDependencyDto): Promise<Dependency> {
    const response = await api.post('/dependencies', data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/dependencies/${id}`)
  },

  async getBlockers(taskId: string): Promise<Dependency[]> {
    const response = await api.get(`/tasks/${taskId}/dependencies`, {
      params: { type: 'blocks' }
    })
    return response.data
  },

  async getDependents(taskId: string): Promise<Dependency[]> {
    const response = await api.get(`/tasks/${taskId}/dependents`)
    return response.data
  },
}
