import api from './api'

export interface MeetingOrganizer {
  userId: string
  username: string
  fullName: string | null
  profileImageUrl: string | null
}

export interface MeetingAttendee {
  id: string
  meetingId: string
  userId: string
  username: string
  fullName: string | null
  profileImageUrl: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
  joinedAt: string
}

export interface Meeting {
  meetingId: string
  title: string
  description: string | null
  agenda: string | null
  startTime: string
  endTime: string
  duration: number | null
  location: string | null
  meetingUrl: string | null
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  taskId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  organizer: MeetingOrganizer
  attendees: MeetingAttendee[]
}

export interface CreateMeetingDto {
  title: string
  description?: string
  agenda?: string
  startTime: string
  endTime: string
  location?: string
  meetingUrl?: string
  taskId?: string
  attendeeIds?: string[]
}

export interface UpdateMeetingDto {
  title?: string
  description?: string
  agenda?: string
  startTime?: string
  endTime?: string
  location?: string
  meetingUrl?: string
  status?: string
  taskId?: string
}

export interface MeetingFilters {
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  upcoming?: boolean
}

export interface MeetingListResponse {
  data: Meeting[]
  total: number
  page: number
  pageSize: number
}

export const meetingService = {
  async getAll(filters?: MeetingFilters): Promise<MeetingListResponse> {
    const response = await api.get('/meetings', { params: filters })
    return response.data
  },

  async getById(id: string): Promise<Meeting> {
    const response = await api.get(`/meetings/${id}`)
    return response.data
  },

  async getMyMeetings(): Promise<Meeting[]> {
    const response = await api.get('/meetings/me')
    return response.data
  },

  async create(data: CreateMeetingDto): Promise<Meeting> {
    const response = await api.post('/meetings', data)
    return response.data
  },

  async update(id: string, data: UpdateMeetingDto): Promise<Meeting> {
    const response = await api.patch(`/meetings/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/meetings/${id}`)
  },

  async addAttendee(meetingId: string, userId: string): Promise<MeetingAttendee> {
    const response = await api.post(`/meetings/${meetingId}/attendees`, { userId })
    return response.data
  },

  async removeAttendee(meetingId: string, userId: string): Promise<void> {
    await api.delete(`/meetings/${meetingId}/attendees/${userId}`)
  },

  async respondToMeeting(meetingId: string, status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'): Promise<void> {
    await api.patch(`/meetings/${meetingId}/respond`, { status })
  },

  async getUpcoming(): Promise<Meeting[]> {
    const response = await api.get('/meetings', {
      params: { upcoming: true, pageSize: 10 }
    })
    return response.data.data || response.data
  },

  // Attachment methods
  async uploadAttachment(meetingId: string, file: File): Promise<MeetingAttachment> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/meetings/${meetingId}/attachments/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async uploadAttachments(meetingId: string, files: File[]): Promise<MeetingAttachment[]> {
    const results: MeetingAttachment[] = []
    for (const file of files) {
      const result = await this.uploadAttachment(meetingId, file)
      results.push(result)
    }
    return results
  },

  async getAttachments(meetingId: string): Promise<MeetingAttachment[]> {
    const response = await api.get(`/meetings/${meetingId}/attachments`)
    return response.data
  },

  async deleteAttachment(meetingId: string, attachmentId: string): Promise<void> {
    await api.delete(`/meetings/${meetingId}/attachments/${attachmentId}`)
  },
}

export interface MeetingAttachment {
  attachmentId: string
  meetingId: string
  fileName: string
  filePath: string
  mimeType: string | null
  fileSize: number | null
  uploadedBy: string | null
  uploadedAt: string
  publicUrl?: string
  uploader?: {
    userId: string
    fullName: string | null
  }
}
