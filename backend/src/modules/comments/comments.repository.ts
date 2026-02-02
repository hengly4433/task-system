import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class CommentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: { taskId: bigint; userId: bigint; commentText: string }) {
    return this.prisma.taskComment.create({
      data,
      include: { user: true },
    });
  }

  async findByTask(taskId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskComment.findMany({
      where: { 
        taskId, 
        deletedAt: null,
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(commentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskComment.findFirst({
      where: { 
        commentId, 
        deletedAt: null,
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: { user: true },
    });
  }

  async softDelete(commentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify ownership
    const comment = await this.findById(commentId);
    if (!comment) throw new Error('Comment not found in this tenant');

    return this.prisma.taskComment.update({
      where: { commentId },
      data: { deletedAt: new Date() },
    });
  }
}
