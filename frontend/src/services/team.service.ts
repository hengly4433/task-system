import api from './api'

export interface TeamMember {
  teamMemberId: string
  userId: string
  joinedAt: string
  user?: {
    userId: string
    username: string
    fullName: string | null
    email: string
    profileImageUrl: string | null
  }
}

export interface Team {
  teamId: string
  teamName: string
  ownerId: string
  departmentId: string | null
  createdAt: string
  memberCount: number
  owner?: {
    userId: string
    username: string
    fullName: string | null
    email: string
    profileImageUrl: string | null
  }
  department?: {
    departmentId: string
    name: string
    code: string
  } | null
  members?: TeamMember[]
}

export interface CreateTeamDto {
  teamName: string
  ownerId: string
  departmentId?: string
  memberIds?: string[]
}

export interface UpdateTeamDto {
  teamName?: string
  departmentId?: string
}

export const teamService = {
  async getAll(params?: { departmentId?: string; search?: string }): Promise<Team[]> {
    const response = await api.get('/teams', { params })
    return Array.isArray(response.data) ? response.data : (response.data.data || [])
  },

  async getById(id: string): Promise<Team> {
    const response = await api.get(`/teams/${id}`)
    return response.data
  },

  async create(data: CreateTeamDto): Promise<Team> {
    const response = await api.post('/teams', data)
    return response.data
  },

  async update(id: string, data: UpdateTeamDto): Promise<Team> {
    const response = await api.put(`/teams/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/teams/${id}`)
  },

  // Member management
  async addMember(teamId: string, userId: string): Promise<Team> {
    const response = await api.post(`/teams/${teamId}/members`, { userId })
    return response.data
  },

  async removeMember(teamId: string, userId: string): Promise<Team> {
    const response = await api.delete(`/teams/${teamId}/members/${userId}`)
    return response.data
  },
}
