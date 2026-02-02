import { Injectable, NotFoundException } from '@nestjs/common';
import { CommentsRepository } from './comments.repository';
import { CommentsMapper } from './comments.mapper';
import { AuditService } from '../../common/audit';
import { PrismaService } from '../../common/database';
import { CreateCommentDto, CommentResponseDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(taskId: string, dto: CreateCommentDto, userId: bigint): Promise<CommentResponseDto> {
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

    const comment = await this.commentsRepository.create({
      taskId: BigInt(taskId),
      userId,
      commentText: dto.commentText,
    });
    await this.auditService.logActivity({
      userId,
      activityType: 'COMMENT_ADDED',
      details: `Added comment to task ${taskId}`,
    });
    
    // Notify task stakeholders
    await this.notificationsService.notifyTaskStakeholders(
      BigInt(taskId),
      userId,
      'COMMENT_ADDED',
      { commentText: dto.commentText },
    );
    
    return CommentsMapper.toResponse(comment);
  }

  async findByTask(taskId: string): Promise<CommentResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify task belongs to tenant before fetching comments
    const task = await this.prisma.task.findFirst({
      where: {
        taskId: BigInt(taskId),
        project: { tenantId },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    const comments = await this.commentsRepository.findByTask(BigInt(taskId));
    return CommentsMapper.toResponseList(comments);
  }

  async delete(commentId: string, userId: bigint): Promise<void> {
    const comment = await this.commentsRepository.findById(BigInt(commentId));
    if (!comment) throw new NotFoundException('Comment not found');
    
    await this.commentsRepository.softDelete(BigInt(commentId));
    await this.auditService.logActivity({
      userId,
      activityType: 'COMMENT_DELETED',
      details: `Deleted comment ${commentId}`,
    });
  }
}
