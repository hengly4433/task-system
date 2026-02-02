import api from './api'

export interface Comment {
  commentId: string
  content: string
  taskId: string
  authorId: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  author?: {
    userId: string
    fullName: string | null
    profileImageUrl: string | null
  }
  replies?: Comment[]
}

export interface CreateCommentDto {
  content: string
  taskId: string
  parentId?: string
}

export interface UpdateCommentDto {
  content: string
}

// Transform API response to frontend format
function mapCommentFromApi(apiComment: any): Comment {
  return {
    commentId: String(apiComment.commentId),
    content: apiComment.commentText,
    taskId: String(apiComment.taskId),
    authorId: String(apiComment.authorId || apiComment.userId),
    parentId: apiComment.parentId ? String(apiComment.parentId) : null,
    createdAt: apiComment.createdAt,
    updatedAt: apiComment.updatedAt,
    author: apiComment.author
      ? {
          userId: String(apiComment.author.userId),
          fullName: apiComment.author.fullName,
          profileImageUrl: apiComment.author.profileImageUrl,
        }
      : undefined,
    replies: apiComment.replies?.map(mapCommentFromApi),
  }
}

export const commentService = {
  async getByTask(taskId: string): Promise<Comment[]> {
    const response = await api.get(`/tasks/${taskId}/comments`)
    return (response.data || []).map(mapCommentFromApi)
  },

  async getById(id: string): Promise<Comment> {
    const response = await api.get(`/comments/${id}`)
    return mapCommentFromApi(response.data)
  },

  async create(data: CreateCommentDto): Promise<Comment> {
    // API expects commentText, not content
    const response = await api.post(`/tasks/${data.taskId}/comments`, {
      commentText: data.content,
    })
    return mapCommentFromApi(response.data)
  },

  async update(id: string, data: UpdateCommentDto): Promise<Comment> {
    const response = await api.patch(`/comments/${id}`, {
      commentText: data.content,
    })
    return mapCommentFromApi(response.data)
  },

  async delete(taskId: string, commentId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`)
  },

  async reply(
    taskId: string,
    parentId: string,
    content: string
  ): Promise<Comment> {
    const response = await api.post(`/tasks/${taskId}/comments`, {
      commentText: content,
      parentId,
    })
    return mapCommentFromApi(response.data)
  },
}
