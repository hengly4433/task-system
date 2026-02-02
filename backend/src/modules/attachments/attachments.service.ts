import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsMapper } from './attachments.mapper';
import { AuditService } from '../../common/audit';
import { PrismaService } from '../../common/database';
import { StorageService } from '../../common/storage';
import { CreateAttachmentDto, AttachmentResponseDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContextService } from '../../common/tenant';
import { SubscriptionService } from '../../common/subscription';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly tenantContext: TenantContextService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async uploadFile(
    taskId: string,
    file: Express.Multer.File,
    userId: bigint,
  ): Promise<AttachmentResponseDto> {
    // Check file size limit for individual files
    await this.subscriptionService.checkFileSizeLimit(BigInt(file.size));
    
    // Check total storage limit before uploading
    await this.subscriptionService.checkStorageLimit(BigInt(file.size));

    const tenantId = this.tenantContext.requireTenantId();

    // Verify task belongs to tenant
    const task = await this.prisma.task.findFirst({
      where: {
        taskId: BigInt(taskId),
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    // Upload to Supabase or local storage
    const uploadResult = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `tasks/${taskId}`,
    );

    // Save metadata to database
    const attachment = await this.attachmentsRepository.create({
      taskId: BigInt(taskId),
      fileName: file.originalname,
      filePath: uploadResult.filePath,
      mimeType: file.mimetype,
      fileSize: BigInt(file.size),
      uploadedBy: userId,
    });

    await this.auditService.logActivity({
      userId,
      activityType: 'ATTACHMENT_ADDED',
      details: `Uploaded file ${file.originalname} to task ${taskId}`,
    });

    // Notify task stakeholders
    await this.notificationsService.notifyTaskStakeholders(
      BigInt(taskId),
      userId,
      'ATTACHMENT_UPLOADED',
      { fileName: file.originalname },
    );

    const response = AttachmentsMapper.toResponse(attachment);
    response.publicUrl = uploadResult.publicUrl;
    return response;
  }

  async create(taskId: string, dto: CreateAttachmentDto, userId: bigint): Promise<AttachmentResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify task belongs to tenant
    const task = await this.prisma.task.findFirst({
      where: {
        taskId: BigInt(taskId),
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    const attachment = await this.attachmentsRepository.create({
      taskId: BigInt(taskId),
      fileName: dto.fileName,
      filePath: dto.filePath,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize ? BigInt(dto.fileSize) : undefined,
      uploadedBy: userId,
    });
    await this.auditService.logActivity({
      userId,
      activityType: 'ATTACHMENT_ADDED',
      details: `Added attachment to task ${taskId}`,
    });
    return AttachmentsMapper.toResponse(attachment);
  }

  async findByTask(taskId: string): Promise<AttachmentResponseDto[]> {
    const attachments = await this.attachmentsRepository.findByTask(BigInt(taskId));
    return attachments.map((a: { filePath: string }) => {
      const response = AttachmentsMapper.toResponse(a as any);
      response.publicUrl = this.storageService.getPublicUrl(a.filePath);
      return response;
    });
  }

  async delete(attachmentId: string, userId: bigint): Promise<void> {
    // Repository's findById already filters by tenant via task.project.tenantId
    const attachment = await this.attachmentsRepository.findById(BigInt(attachmentId));
    if (!attachment) {
      throw new NotFoundException('Attachment not found in this tenant');
    }

    // Delete from storage
    await this.storageService.deleteFile(attachment.filePath);

    // Delete from database - repository's delete method also verifies tenant
    await this.attachmentsRepository.delete(BigInt(attachmentId));
    await this.auditService.logActivity({
      userId,
      activityType: 'ATTACHMENT_DELETED',
      details: `Deleted attachment ${attachmentId}`,
    });
  }
}
