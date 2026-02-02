import api from './api'

export interface UserPreferences {
  preferenceId: string
  userId: string
  theme: string
  language: string
  timezone: string
  emailNotifications: boolean
  pushNotifications: boolean
  weekStartDay: number
  dateFormat: string
  timeFormat: string
  createdAt: string
  updatedAt: string
}

export interface UpdatePreferencesDto {
  theme?: string
  language?: string
  timezone?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  weekStartDay?: number
  dateFormat?: string
  timeFormat?: string
}

export const preferenceService = {
  async get(): Promise<UserPreferences> {
    const response = await api.get('/preferences')
    return response.data
  },

  async update(data: UpdatePreferencesDto): Promise<UserPreferences> {
    const response = await api.patch('/preferences', data)
    return response.data
  },

  async reset(): Promise<UserPreferences> {
    const response = await api.post('/preferences/reset')
    return response.data
  },
}
