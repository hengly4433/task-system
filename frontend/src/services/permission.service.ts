import api from './api'

export interface Permission {
  permissionId: string
  code: string
  name: string
  description: string | null
  category: string
  sortOrder: number
  createdAt: string
}

export interface RolePermission {
  roleId: string
  permissionId: string
  granted: boolean
}

export interface PermissionsByCategory {
  category: string
  permissions: Permission[]
}

export interface UpdateRolePermissionsPayload {
  permissions: { permissionId: string; granted: boolean }[]
}

export const permissionService = {
  // Get all permissions
  async getAll(): Promise<Permission[]> {
    const response = await api.get('/permissions')
    return response.data
  },

  // Get all permissions grouped by category
  async getAllGrouped(): Promise<PermissionsByCategory[]> {
    const response = await api.get('/permissions/grouped')
    return response.data
  },

  // Get permission categories
  async getCategories(): Promise<string[]> {
    const response = await api.get('/permissions/categories')
    return response.data
  },

  // Get permissions by category
  async getByCategory(category: string): Promise<Permission[]> {
    const response = await api.get(`/permissions/category/${category}`)
    return response.data
  },

  // Get permissions for a specific role
  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    const response = await api.get(`/permissions/roles/${roleId}`)
    return response.data
  },

  // Update permissions for a role (batch update)
  async updateRolePermissions(roleId: string, payload: UpdateRolePermissionsPayload): Promise<RolePermission[]> {
    const response = await api.put(`/permissions/roles/${roleId}`, payload)
    return response.data
  },

  // Seed initial permissions (development)
  async seedPermissions(): Promise<{ message: string }> {
    const response = await api.post('/permissions/seed')
    return response.data
  },
}
