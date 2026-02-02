import api from './api'

export interface Sprint {
  sprintId: string
  name: string
  goal: string | null
  projectId: string
  startDate: string
  endDate: string
  status: string
  createdAt: string
  updatedAt: string
  tasksCount?: number
  completedTasksCount?: number
  storyPoints?: number
  completedStoryPoints?: number
}

export interface CreateSprintDto {
  name: string
  goal?: string
  projectId: string
  startDate?: string
  endDate?: string
}

export interface UpdateSprintDto {
  name?: string
  goal?: string
  startDate?: string
  endDate?: string
  status?: string
}

// Map API response to frontend format
function mapSprintFromApi(apiSprint: any): Sprint {
  return {
    sprintId: String(apiSprint.sprintId),
    name: apiSprint.sprintName || apiSprint.name,
    goal: apiSprint.goal,
    projectId: String(apiSprint.projectId),
    startDate: apiSprint.startDate,
    endDate: apiSprint.endDate,
    status: apiSprint.status,
    createdAt: apiSprint.createdAt,
    updatedAt: apiSprint.updatedAt,
    tasksCount: apiSprint.tasksCount,
    completedTasksCount: apiSprint.completedTasksCount,
    storyPoints: apiSprint.storyPoints,
    completedStoryPoints: apiSprint.completedStoryPoints,
  }
}

export const sprintService = {
  async getByProject(projectId: string): Promise<Sprint[]> {
    const response = await api.get(`/projects/${projectId}/sprints`)
    return response.data.map(mapSprintFromApi)
  },

  async getById(id: string): Promise<Sprint> {
    const response = await api.get(`/sprints/${id}`)
    return mapSprintFromApi(response.data)
  },

  async create(data: CreateSprintDto): Promise<Sprint> {
    const response = await api.post('/sprints', data)
    return response.data
  },

  async update(id: string, data: UpdateSprintDto): Promise<Sprint> {
    const response = await api.patch(`/sprints/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sprints/${id}`)
  },

  async start(id: string): Promise<Sprint> {
    const response = await api.patch(`/sprints/${id}/start`)
    return response.data
  },

  async complete(id: string): Promise<Sprint> {
    const response = await api.patch(`/sprints/${id}/complete`)
    return response.data
  },

  async getTasks(id: string): Promise<any[]> {
    const response = await api.get(`/sprints/${id}/tasks`)
    return response.data
  },

  async addTask(sprintId: string, taskId: string): Promise<void> {
    await api.post(`/sprints/${sprintId}/tasks/${taskId}`)
  },

  async removeTask(sprintId: string, taskId: string): Promise<void> {
    await api.delete(`/sprints/${sprintId}/tasks/${taskId}`)
  },

  async createFromTemplate(projectId: string, templateId: string): Promise<Sprint> {
    const response = await api.post(`/projects/${projectId}/sprints/from-template`, { templateId })
    return mapSprintFromApi(response.data)
  },
}
