import api from './api'

export interface User {
  userId: string
  username: string
  email: string
  fullName: string | null
  position: { positionId: string; positionName: string } | null
  positionId: string | null
  roles: Array<{ roleId: string; roleName: string }>
  departments: Array<{ departmentId: string; name: string; isPrimary: boolean }>
  profileImageUrl: string | null
  presenceStatus?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  username: string
  email: string
  password: string
  fullName?: string
  position?: string
}

export interface UpdateUserDto {
  username?: string
  email?: string
  fullName?: string
  positionId?: string | null
  roleIds?: string[]
  departmentId?: string | null
  profileImageUrl?: string
  password?: string
}

export interface UserFilters {
  search?: string
  page?: number
  pageSize?: number
}

export const userService = {
  async getAll(filters?: UserFilters): Promise<{ data: User[], total: number }> {
    const response = await api.get('/users', { params: filters })
    return response.data
  },

  async getById(id: string): Promise<User> {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post('/users', data)
    return response.data
  },

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const response = await api.patch(`/users/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile')
    return response.data
  },

  async updateProfile(data: UpdateUserDto): Promise<User> {
    const response = await api.patch('/users/profile', data)
    return response.data
  },

  async uploadAvatar(userId: string, file: File): Promise<{ profileImageUrl: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/users/${userId}/upload-avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/users/${userId}/change-password`, {
      oldPassword,
      newPassword,
    })
    return response.data
  },
}

