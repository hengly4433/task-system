import api from './api'

export interface Project {
  projectId: string
  name: string
  description: string | null
  workspaceId: string
  status: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  taskCount?: number
  completedTaskCount?: number
  departmentId?: string
}

export interface CreateProjectDto {
  projectName: string
  description?: string
  startDate?: string
  endDate?: string
  teamId?: number
  workspaceId?: string
  departmentId?: string
}

export interface UpdateProjectDto {
  projectName?: string
  description?: string
  status?: string
  startDate?: string
  endDate?: string
  workspaceId?: string
  departmentId?: string
}

export const projectService = {
  async getAll(workspaceId?: string): Promise<Project[]> {
    const params = workspaceId ? { workspaceId } : {}
    const response = await api.get('/projects', { params })
    const data = response.data.data || response.data
    return Array.isArray(data) ? data.map((p: any) => ({
      ...p,
      name: p.name || p.projectName || 'Untitled Project',
    })) : []
  },

  async getById(id: string): Promise<Project> {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  async create(data: CreateProjectDto): Promise<Project> {
    const response = await api.post('/projects', data)
    return response.data
  },

  async update(id: string, data: UpdateProjectDto): Promise<Project> {
    const response = await api.patch(`/projects/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },

  async getMembers(id: string): Promise<any[]> {
    const response = await api.get(`/projects/${id}/members`)
    return response.data
  },
}
