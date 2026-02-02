import api from './api'

export interface Workspace {
  workspaceId: string
  name: string
  description: string | null
  ownerId: string
  departmentId: string | null
  isDefault?: boolean
  createdAt: string
  updatedAt: string
  memberCount?: number
  projectCount?: number
  department?: {
    departmentId: string
    name: string
    code: string
  }
}

export interface CreateWorkspaceDto {
  name: string
  description?: string
  departmentId?: string
}

export interface UpdateWorkspaceDto {
  name?: string
  description?: string
  departmentId?: string
}

export interface WorkspaceFilters {
  departmentId?: string
  search?: string
}

export const workspaceService = {
  async getAll(filters?: WorkspaceFilters): Promise<Workspace[]> {
    const params = new URLSearchParams()
    if (filters?.departmentId) params.append('departmentId', filters.departmentId)
    if (filters?.search) params.append('search', filters.search)
    
    const queryString = params.toString()
    const response = await api.get(`/workspaces${queryString ? `?${queryString}` : ''}`)
    return response.data
  },

  async getById(id: string): Promise<Workspace> {
    const response = await api.get(`/workspaces/${id}`)
    return response.data
  },

  async create(data: CreateWorkspaceDto): Promise<Workspace> {
    const response = await api.post('/workspaces', data)
    return response.data
  },

  async update(id: string, data: UpdateWorkspaceDto): Promise<Workspace> {
    const response = await api.patch(`/workspaces/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`)
  },

  async getMembers(id: string): Promise<any[]> {
    const response = await api.get(`/workspaces/${id}/members`)
    return response.data
  },

  async addMember(workspaceId: string, userId: string, role: string = 'member'): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/members`, { userId, role })
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
  },
}
