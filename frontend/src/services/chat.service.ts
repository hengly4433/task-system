import api from './api'

export interface ChatUser {
  userId: string
  username: string
  fullName: string | null
  profileImageUrl: string | null
  presenceStatus?: string | null
  lastSeenAt?: string | null
}

export interface ChatParticipant {
  user: ChatUser
  isBlocked: boolean
  isMarked: boolean
  lastReadAt?: string | null
}

export interface ChatReaction {
  emoji: string
  count: number
  userIds: string[]
}

export interface ChatMessage {
  messageId: string
  threadId: string
  content: string
  createdAt: string
  updatedAt?: string | null
  isEdited: boolean
  isDeleted: boolean
  sender: ChatUser
  attachmentUrl?: string | null
  attachmentType?: string | null
  attachmentName?: string | null
  reactions: ChatReaction[]
}

export interface ChatThread {
  threadId: string
  isGroup: boolean
  title?: string | null
  participants: ChatParticipant[]
  lastMessage?: ChatMessage | null
  unreadCount: number
  isBlocked: boolean
  isMarked: boolean
  updatedAt: string
}

export interface ThreadListResponse {
  data: ChatThread[]
  total: number
  page: number
  pageSize: number
}

export interface MessagesResponse {
  data: ChatMessage[]
  hasMore: boolean
  nextCursor?: string | null
  pageSize: number
}

export interface SearchResultResponse {
  data: ChatMessage[]
  total: number
  page: number
  pageSize: number
}

export interface ThreadFilters {
  filter?: 'all' | 'marked' | 'blocked'
  search?: string
  page?: number
  pageSize?: number
}

export interface CreateThreadPayload {
  participantIds: string[]
  title?: string
  isGroup?: boolean
  initialMessage?: string
}

export interface TypingEvent {
  threadId: string
  userId: string
  username: string
  isTyping: boolean
}

export interface ReactionEvent {
  messageId: string
  threadId: string
  emoji: string
  userId: string
  action: 'add' | 'remove'
}

export interface MessageEditEvent {
  threadId: string
  message: ChatMessage
}

export interface MessageDeleteEvent {
  threadId: string
  messageId: string
  message: ChatMessage
}

export interface PresenceEvent {
  userId: string
  status: string
  lastSeenAt?: string
}

export const chatService = {
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/chat/unread-count')
    return response.data
  },

  async listThreads(params?: ThreadFilters): Promise<ThreadListResponse> {
    const response = await api.get('/chat/threads', { params })
    return response.data
  },

  async getThread(threadId: string): Promise<ChatThread> {
    const response = await api.get(`/chat/threads/${threadId}`)
    return response.data
  },

  async createThread(payload: CreateThreadPayload): Promise<ChatThread> {
    const response = await api.post('/chat/threads', payload)
    return response.data
  },

  async getMessages(threadId: string, params?: { cursor?: string; pageSize?: number }): Promise<MessagesResponse> {
    const response = await api.get(`/chat/threads/${threadId}/messages`, { params })
    return response.data
  },

  async sendMessage(threadId: string, content: string): Promise<ChatMessage> {
    const response = await api.post(`/chat/threads/${threadId}/messages`, { content })
    return response.data
  },

  async sendMessageWithAttachment(threadId: string, file: File, content?: string): Promise<ChatMessage> {
    const formData = new FormData()
    formData.append('file', file)
    if (content) {
      formData.append('content', content)
    }
    
    // Set Content-Type header to undefined to let browser set it with boundary
    const response = await api.post(`/chat/threads/${threadId}/messages/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async updatePresence(status: string): Promise<ChatUser> {
    const response = await api.patch('/chat/presence', { status })
    return response.data
  },

  async setMarked(threadId: string, value: boolean): Promise<ChatThread> {
    const response = await api.patch(`/chat/threads/${threadId}/mark`, { value })
    return response.data
  },

  async setBlocked(threadId: string, value: boolean): Promise<ChatThread> {
    const response = await api.patch(`/chat/threads/${threadId}/block`, { value })
    return response.data
  },

  async markAsRead(threadId: string, messageId?: string): Promise<ChatThread> {
    const response = await api.patch(`/chat/threads/${threadId}/read`, { messageId })
    return response.data
  },

  async addReaction(messageId: string, emoji: string): Promise<ChatMessage> {
    const response = await api.post(`/chat/messages/${messageId}/reactions`, { emoji })
    return response.data
  },

  async removeReaction(messageId: string, emoji: string): Promise<ChatMessage> {
    const response = await api.delete(`/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`)
    return response.data
  },

  async editMessage(messageId: string, content: string): Promise<ChatMessage> {
    const response = await api.patch(`/chat/messages/${messageId}`, { content })
    return response.data
  },

  async deleteMessage(messageId: string): Promise<ChatMessage> {
    const response = await api.delete(`/chat/messages/${messageId}`)
    return response.data
  },

  async searchMessages(q: string, page = 1, pageSize = 20): Promise<SearchResultResponse> {
    const response = await api.get('/chat/search', { params: { q, page, pageSize } })
    return response.data
  },
}

