import api from './api'

export interface Department {
  departmentId: string
  name: string
  code: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  userCount?: number
  workspaceCount?: number
}

export interface CreateDepartmentDto {
  name: string
  code: string
  description?: string
  isActive?: boolean
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> {}

export interface ListDepartmentsQuery {
  search?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export const departmentService = {
  async getAll(query: ListDepartmentsQuery = {}): Promise<PaginatedResult<Department>> {
    const params = new URLSearchParams()
    if (query.search) params.append('search', query.search)
    if (query.isActive !== undefined) params.append('isActive', String(query.isActive))
    if (query.page) params.append('page', String(query.page))
    if (query.pageSize) params.append('pageSize', String(query.pageSize))
    
    const response = await api.get(`/departments?${params.toString()}`)
    return response.data
  },

  async getById(departmentId: string): Promise<Department> {
    const response = await api.get(`/departments/${departmentId}`)
    return response.data
  },

  async create(data: CreateDepartmentDto): Promise<Department> {
    const response = await api.post('/departments', data)
    return response.data
  },

  async update(departmentId: string, data: UpdateDepartmentDto): Promise<Department> {
    const response = await api.patch(`/departments/${departmentId}`, data)
    return response.data
  },

  async delete(departmentId: string): Promise<void> {
    await api.delete(`/departments/${departmentId}`)
  },

  async addUserToDepartment(departmentId: string, userId: string, isPrimary?: boolean): Promise<void> {
    await api.post(`/departments/${departmentId}/users/${userId}`, { isPrimary })
  },

  async removeUserFromDepartment(departmentId: string, userId: string): Promise<void> {
    await api.delete(`/departments/${departmentId}/users/${userId}`)
  },
}

export default departmentService
