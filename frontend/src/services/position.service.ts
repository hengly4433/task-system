import api from './api'

export interface Position {
  positionId: string
  positionName: string
  description: string | null
  createdAt: string
}

export interface CreatePositionDto {
  positionName: string
  description?: string
}

export interface UpdatePositionDto {
  positionName?: string
  description?: string
}

export const positionService = {
  async getAll(): Promise<Position[]> {
    const response = await api.get('/positions')
    return response.data
  },

  async getById(id: string): Promise<Position> {
    const response = await api.get(`/positions/${id}`)
    return response.data
  },

  async create(dto: CreatePositionDto): Promise<Position> {
    const response = await api.post('/positions', dto)
    return response.data
  },

  async update(id: string, dto: UpdatePositionDto): Promise<Position> {
    const response = await api.put(`/positions/${id}`, dto)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/positions/${id}`)
  },
}
