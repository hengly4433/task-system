import api from './api'

export interface Role {
  roleId: string
  roleName: string
  description: string | null
  color: string | null
  isSystem?: boolean
  createdAt: string
}

export interface CreateRoleDto {
  roleName: string
  description?: string
  color?: string
}

export interface UpdateRoleDto {
  roleName?: string
  description?: string
  color?: string
}

export const roleService = {
  async getAll(): Promise<Role[]> {
    const response = await api.get('/roles')
    return response.data
  },

  async getById(id: string): Promise<Role> {
    const response = await api.get(`/roles/${id}`)
    return response.data
  },

  async create(data: CreateRoleDto): Promise<Role> {
    const response = await api.post('/roles', data)
    return response.data
  },

  async update(id: string, data: UpdateRoleDto): Promise<Role> {
    const response = await api.put(`/roles/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`)
  },

  async assignToUser(roleId: string, userId: string): Promise<void> {
    await api.post(`/roles/${roleId}/users/${userId}`)
  },

  async removeFromUser(roleId: string, userId: string): Promise<void> {
    await api.delete(`/roles/${roleId}/users/${userId}`)
  },
}

