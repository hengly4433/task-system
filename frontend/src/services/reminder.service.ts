import api from './api'

export interface Reminder {
  reminderId: string
  title: string
  message: string | null
  taskId: string | null
  userId: string
  remindAt: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
  task?: {
    taskId: string
    title: string
  }
}

export interface CreateReminderDto {
  title: string
  message?: string
  taskId?: string
  remindAt: string
}

export interface UpdateReminderDto {
  title?: string
  message?: string
  remindAt?: string
  isCompleted?: boolean
}

export const reminderService = {
  async getAll(): Promise<Reminder[]> {
    const response = await api.get('/reminders')
    return response.data
  },

  async getById(id: string): Promise<Reminder> {
    const response = await api.get(`/reminders/${id}`)
    return response.data
  },

  async create(data: CreateReminderDto): Promise<Reminder> {
    const response = await api.post('/reminders', data)
    return response.data
  },

  async update(id: string, data: UpdateReminderDto): Promise<Reminder> {
    const response = await api.patch(`/reminders/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/reminders/${id}`)
  },

  async markComplete(id: string): Promise<Reminder> {
    const response = await api.patch(`/reminders/${id}`, { isCompleted: true })
    return response.data
  },

  async getUpcoming(): Promise<Reminder[]> {
    const response = await api.get('/reminders', {
      params: { isCompleted: false }
    })
    return response.data
  },
}
