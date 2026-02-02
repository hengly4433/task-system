import { AttachmentResponseDto } from './dto';

type AttachmentModel = {
  attachmentId: bigint;
  taskId: bigint;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  fileSize: bigint | null;
  uploadedBy: bigint | null;
  uploadedAt: Date;
};

export class AttachmentsMapper {
  static toResponse(a: AttachmentModel): AttachmentResponseDto {
    return {
      attachmentId: a.attachmentId.toString(),
      taskId: a.taskId.toString(),
      fileName: a.fileName,
      filePath: a.filePath,
      mimeType: a.mimeType,
      fileSize: a.fileSize?.toString() || null,
      uploadedBy: a.uploadedBy?.toString() || null,
      uploadedAt: a.uploadedAt.toISOString(),
    };
  }

  static toResponseList(attachments: AttachmentModel[]): AttachmentResponseDto[] {
    return attachments.map((a) => this.toResponse(a));
  }
}
