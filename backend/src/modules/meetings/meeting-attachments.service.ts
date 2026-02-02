import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { StorageService } from '../../common/storage';
import { AuditService } from '../../common/audit';

export interface MeetingAttachmentResponseDto {
  attachmentId: string;
  meetingId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedBy: string | null;
  uploadedAt: string;
  publicUrl?: string;
  uploader?: {
    userId: string;
    fullName: string | null;
  };
}

@Injectable()
export class MeetingAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async uploadFile(
    meetingId: string,
    file: Express.Multer.File,
    userId: bigint,
  ): Promise<MeetingAttachmentResponseDto> {
    // Verify meeting exists
    const meeting = await this.prisma.meeting.findUnique({
      where: { meetingId: BigInt(meetingId) },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Upload to Supabase storage
    const uploadResult = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `meetings/${meetingId}`,
    );

    // Save metadata to database
    const attachment = await this.prisma.meetingAttachment.create({
      data: {
        meetingId: BigInt(meetingId),
        fileName: file.originalname,
        filePath: uploadResult.filePath,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        uploadedBy: userId,
      },
      include: {
        uploader: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    await this.auditService.logActivity({
      userId,
      activityType: 'ATTACHMENT_ADDED',
      details: `Uploaded file ${file.originalname} to meeting ${meetingId}`,
    });

    return this.mapToResponse(attachment, uploadResult.publicUrl);
  }

  async findByMeeting(meetingId: string): Promise<MeetingAttachmentResponseDto[]> {
    const attachments = await this.prisma.meetingAttachment.findMany({
      where: { meetingId: BigInt(meetingId) },
      include: {
        uploader: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    return attachments.map((a) => {
      const publicUrl = this.storageService.getPublicUrl(a.filePath);
      return this.mapToResponse(a, publicUrl);
    });
  }

  async findById(attachmentId: string): Promise<MeetingAttachmentResponseDto> {
    const attachment = await this.prisma.meetingAttachment.findUnique({
      where: { attachmentId: BigInt(attachmentId) },
      include: {
        uploader: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const publicUrl = this.storageService.getPublicUrl(attachment.filePath);
    return this.mapToResponse(attachment, publicUrl);
  }

  async delete(
    meetingId: string,
    attachmentId: string,
    userId: bigint,
  ): Promise<void> {
    const attachment = await this.prisma.meetingAttachment.findUnique({
      where: { attachmentId: BigInt(attachmentId) },
      include: { meeting: true },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.meetingId !== BigInt(meetingId)) {
      throw new NotFoundException('Attachment not found in this meeting');
    }

    // Only meeting creator or attachment uploader can delete
    const isCreator = attachment.meeting.createdBy === userId;
    const isUploader = attachment.uploadedBy === userId;
    if (!isCreator && !isUploader) {
      throw new ForbiddenException('You do not have permission to delete this attachment');
    }

    // Delete from Supabase storage
    await this.storageService.deleteFile(attachment.filePath);

    // Delete from database
    await this.prisma.meetingAttachment.delete({
      where: { attachmentId: BigInt(attachmentId) },
    });

    await this.auditService.logActivity({
      userId,
      activityType: 'ATTACHMENT_DELETED',
      details: `Deleted attachment ${attachment.fileName} from meeting ${meetingId}`,
    });
  }

  private mapToResponse(
    attachment: any,
    publicUrl?: string,
  ): MeetingAttachmentResponseDto {
    return {
      attachmentId: String(attachment.attachmentId),
      meetingId: String(attachment.meetingId),
      fileName: attachment.fileName,
      filePath: attachment.filePath,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize ? Number(attachment.fileSize) : null,
      uploadedBy: attachment.uploadedBy ? String(attachment.uploadedBy) : null,
      uploadedAt: attachment.uploadedAt.toISOString(),
      publicUrl,
      uploader: attachment.uploader
        ? {
            userId: String(attachment.uploader.userId),
            fullName: attachment.uploader.fullName,
          }
        : undefined,
    };
  }
}
