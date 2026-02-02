import api from './api'

export interface TaskInfo {
  taskId: string
  taskName: string
  projectId: string | null
  projectName: string | null
}

export interface TimeEntry {
  timeEntryId: string
  taskId: string
  userId: string
  date: string
  hours: number
  description: string | null
  createdAt: string
  updatedAt: string
  task?: TaskInfo
}

export interface WeeklyTimeEntry {
  taskId: string
  taskName: string
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  days: number[]
  entryIds: (string | null)[]
  totalHours: number
}

export interface WeeklyTimesheetResponse {
  startDate: string
  endDate: string
  entries: WeeklyTimeEntry[]
  totalHours: number
  tasksLogged: number
  dailyTotals: number[]
}

export interface CreateTimeEntryDto {
  taskId: string
  date: string
  hours: number
  description?: string
}

export interface UpdateTimeEntryDto {
  hours?: number
  description?: string
}

export interface TimeEntryFilters {
  taskId?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export const timesheetService = {
  async getAll(filters?: TimeEntryFilters): Promise<{ data: TimeEntry[], total: number }> {
    const response = await api.get('/time-entries', { params: filters })
    return response.data
  },

  async getWeekly(startDate: string): Promise<WeeklyTimesheetResponse> {
    const response = await api.get('/time-entries/weekly', { params: { startDate } })
    return response.data
  },

  async create(data: CreateTimeEntryDto): Promise<TimeEntry> {
    const response = await api.post('/time-entries', data)
    return response.data
  },

  async update(id: string, data: UpdateTimeEntryDto): Promise<TimeEntry> {
    const response = await api.patch(`/time-entries/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/time-entries/${id}`)
  },

  async getByTask(taskId: string): Promise<TimeEntry[]> {
    const response = await api.get(`/time-entries/task/${taskId}`)
    return response.data
  },
}
