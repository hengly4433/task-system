import api from './api'

export interface BugReport {
  bugReportId: string
  title: string
  description: string
  severity: string
  status: string
  projectId: string
  reportedById: string
  assignedToId: string | null
  createdAt: string
  updatedAt: string
  reportedBy?: {
    userId: string
    fullName: string | null
  }
  assignedTo?: {
    userId: string
    fullName: string | null
  }
}

export interface CreateBugReportDto {
  title: string
  description: string
  severity?: string
  projectId: string
  assignedToId?: string
}

export interface UpdateBugReportDto {
  title?: string
  description?: string
  severity?: string
  status?: string
  assignedToId?: string
}

export const bugReportService = {
  async getAll(projectId?: string): Promise<BugReport[]> {
    const params = projectId ? { projectId } : {}
    const response = await api.get('/bug-reports', { params })
    return response.data
  },

  async getById(id: string): Promise<BugReport> {
    const response = await api.get(`/bug-reports/${id}`)
    return response.data
  },

  async create(data: CreateBugReportDto): Promise<BugReport> {
    const response = await api.post('/bug-reports', data)
    return response.data
  },

  async update(id: string, data: UpdateBugReportDto): Promise<BugReport> {
    const response = await api.patch(`/bug-reports/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/bug-reports/${id}`)
  },

  async updateStatus(id: string, status: string): Promise<BugReport> {
    const response = await api.patch(`/bug-reports/${id}`, { status })
    return response.data
  },
}
