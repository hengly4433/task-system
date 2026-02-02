import api from './api'

export interface Board {
  boardId: string
  name: string
  description: string | null
  projectId: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateBoardDto {
  name: string
  description?: string
  projectId: string
  position?: number
}

export interface UpdateBoardDto {
  name?: string
  description?: string
  position?: number
}

export const boardService = {
  async getAll(projectId?: string): Promise<Board[]> {
    const params = projectId ? { projectId } : {}
    const response = await api.get('/boards', { params })
    return response.data
  },

  async getById(id: string): Promise<Board> {
    const response = await api.get(`/boards/${id}`)
    return response.data
  },

  async create(data: CreateBoardDto): Promise<Board> {
    const response = await api.post('/boards', data)
    return response.data
  },

  async update(id: string, data: UpdateBoardDto): Promise<Board> {
    const response = await api.patch(`/boards/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/boards/${id}`)
  },

  async reorder(projectId: string, boardIds: string[]): Promise<void> {
    await api.patch(`/boards/reorder`, { projectId, boardIds })
  },
}
