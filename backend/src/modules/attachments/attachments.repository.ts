import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class AttachmentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: {
    taskId: bigint;
    fileName: string;
    filePath: string;
    mimeType?: string;
    fileSize?: bigint;
    uploadedBy: bigint;
  }) {
    return this.prisma.attachment.create({ data });
  }

  async findByTask(taskId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.attachment.findMany({ 
      where: { 
        taskId,
        task: {
          project: {
            tenantId,
          },
        },
      } 
    });
  }

  async findById(attachmentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.attachment.findFirst({ 
      where: { 
        attachmentId,
        task: {
          project: {
            tenantId,
          },
        },
      } 
    });
  }

  async delete(attachmentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify ownership
    const attachment = await this.findById(attachmentId);
    if (!attachment) throw new Error('Attachment not found in this tenant');

    return this.prisma.attachment.delete({ where: { attachmentId } });
  }
}
