import api from './api'

export interface Attachment {
  attachmentId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  taskId: string
  uploadedById: string
  createdAt: string
  uploadedBy?: {
    userId: string
    fullName: string | null
  }
}

// Transform API response to frontend format
function mapAttachmentFromApi(apiAttachment: any): Attachment {
  return {
    attachmentId: String(apiAttachment.attachmentId),
    fileName: apiAttachment.fileName,
    // Backend returns publicUrl for the file URL
    fileUrl: apiAttachment.publicUrl || apiAttachment.fileUrl || `/uploads/${apiAttachment.filePath}`,
    fileSize: Number(apiAttachment.fileSize) || 0,
    mimeType: apiAttachment.mimeType || 'application/octet-stream',
    taskId: String(apiAttachment.taskId),
    uploadedById: String(apiAttachment.uploadedBy || apiAttachment.uploadedById),
    createdAt: apiAttachment.uploadedAt || apiAttachment.createdAt,
    uploadedBy: apiAttachment.uploader
      ? {
          userId: String(apiAttachment.uploader.userId),
          fullName: apiAttachment.uploader.fullName,
        }
      : undefined,
  }
}

export const attachmentService = {
  async getByTask(taskId: string): Promise<Attachment[]> {
    const response = await api.get(`/tasks/${taskId}/attachments`)
    return (response.data || []).map(mapAttachmentFromApi)
  },

  async getById(id: string): Promise<Attachment> {
    const response = await api.get(`/attachments/${id}`)
    return mapAttachmentFromApi(response.data)
  },

  async upload(taskId: string, file: File): Promise<Attachment> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/tasks/${taskId}/attachments/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return mapAttachmentFromApi(response.data)
  },

  async delete(taskId: string, attachmentId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`)
  },

  async download(taskId: string, attachmentId: string): Promise<Blob> {
    const response = await api.get(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },
}
