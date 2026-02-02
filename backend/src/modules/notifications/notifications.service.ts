import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { NotificationResponseDto } from './dto';
import { NotificationsGateway } from './notifications.gateway';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findByUser(userId: bigint): Promise<NotificationResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify user belongs to tenant
    const userMember = await this.prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });
    if (!userMember) throw new Error('User not found in this tenant');

    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return notifications.map((n) => ({
      notificationId: n.notificationId.toString(),
      notificationText: n.notificationText,
      entityType: n.entityType ?? undefined,
      entityId: n.entityId ?? undefined,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async markAsRead(notificationId: string, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const notification = await this.prisma.notification.findFirst({
      where: { 
        notificationId: BigInt(notificationId),
        userId,
        user: {
          tenantMembers: {
            some: {
              tenantId,
            }
          }
        }
      },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.update({
      where: { notificationId: BigInt(notificationId) },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    await this.prisma.notification.updateMany({
      where: { 
        userId, 
        isRead: false,
        user: {
          tenantMembers: {
            some: {
              tenantId,
            }
          }
        }
      },
      data: { isRead: true },
    });
  }

  async createNotification(
    userId: bigint,
    notificationText: string,
    entityType?: string,
    entityId?: string,
  ): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        notificationText,
        entityType,
        entityId,
      },
    });

    // Send real-time notification
    this.notificationsGateway.sendToUser(userId, {
      notificationId: notification.notificationId.toString(),
      notificationText: notification.notificationText,
      entityType: notification.entityType,
      entityId: notification.entityId,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  async notifyTaskStakeholders(
    taskId: bigint,
    actorUserId: bigint,
    actionType: string,
    details?: {
      commentText?: string;
      newStatus?: string;
      newPriority?: string;
      newAssigneeId?: string;
      sprintId?: string;
      sprintName?: string;
      fileName?: string;
      newDueDate?: string;
      milestoneName?: string;
      testerName?: string;
      changeDescription?: string;
    },
  ): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    // Fetch task with creator, assignee, tester - verified by tenant
    const task = await this.prisma.task.findFirst({
      where: { 
        taskId,
        project: {
          tenantId,
        },
      },
      include: {
        creator: { select: { userId: true, fullName: true, username: true } },
        assignee: { select: { userId: true, fullName: true, username: true } },
        tester: { select: { userId: true, fullName: true, username: true } },
      },
    });

    if (!task) {
      console.warn(`Task ${taskId} not found for notification`);
      return;
    }

    // Fetch actor details
    const actor = await this.prisma.user.findUnique({
      where: { userId: actorUserId },
      select: { fullName: true, username: true },
    });

    if (!actor) {
      console.warn(`Actor user ${actorUserId} not found for notification`);
      return;
    }

    const actorName = actor.fullName || actor.username;
    const taskName = task.taskName;

    // Determine recipients (exclude actor to avoid self-notifications)
    const recipients: bigint[] = [];

    // Add creator
    if (task.createdBy && task.createdBy !== actorUserId) {
      recipients.push(task.createdBy);
    }

    // Add assignee
    if (task.assignedTo && task.assignedTo !== actorUserId) {
      recipients.push(task.assignedTo);
    }

    // Add tester
    if (task.testerId && task.testerId !== actorUserId) {
      recipients.push(task.testerId);
    }

    // Add watchers
    const watchers = await this.prisma.taskWatcher.findMany({
      where: { taskId },
      select: { userId: true },
    });
    watchers.forEach((w) => {
      if (w.userId !== actorUserId) {
        recipients.push(w.userId);
      }
    });

    // Remove duplicates using BigInt comparison
    const uniqueRecipients = recipients.filter((userId, index, self) =>
      index === self.findIndex((u) => u === userId)
    );

    console.log(`[NotificationsService] Task: ${taskId}, Actor: ${actorUserId}, Recipients: ${uniqueRecipients.map(r => r.toString()).join(', ')}`);

    if (uniqueRecipients.length === 0) {
      console.log(`[NotificationsService] No one to notify for task ${taskId}`);
      return; // No one to notify
    }

    // Generate notification text based on action type
    let notificationText: string;

    switch (actionType) {
      case 'COMMENT_ADDED':
        notificationText = `${actorName} commented on '${taskName}'`;
        break;
      case 'TASK_STATUS_UPDATED':
        notificationText = `${actorName} changed status to ${details?.newStatus} on '${taskName}'`;
        break;
      case 'TASK_PRIORITY_UPDATED':
        notificationText = `${actorName} changed priority to ${details?.newPriority} on '${taskName}'`;
        break;
      case 'TASK_ASSIGNED':
        notificationText = `${actorName} assigned '${taskName}' to you`;
        break;
      case 'TASK_REASSIGNED':
        notificationText = `${actorName} reassigned '${taskName}'`;
        break;
      case 'SPRINT_UPDATED':
        notificationText = `${actorName} moved '${taskName}' to ${details?.sprintName || 'a sprint'}`;
        break;
      case 'ATTACHMENT_UPLOADED':
        notificationText = `${actorName} uploaded ${details?.fileName || 'a file'} to '${taskName}'`;
        break;
      case 'DUE_DATE_UPDATED':
        notificationText = `${actorName} changed due date to ${details?.newDueDate || 'a new date'} on '${taskName}'`;
        break;
      case 'DESCRIPTION_UPDATED':
        notificationText = `${actorName} updated the description of '${taskName}'`;
        break;
      case 'MILESTONE_UPDATED':
        notificationText = `${actorName} changed milestone to ${details?.milestoneName || 'a new milestone'} on '${taskName}'`;
        break;
      case 'TESTER_ASSIGNED':
        notificationText = `${actorName} assigned ${details?.testerName || 'a tester'} to test '${taskName}'`;
        break;
      case 'TASK_DELETED':
        notificationText = `${actorName} deleted task '${taskName}'`;
        break;
      case 'TASK_UPDATED':
        notificationText = details?.changeDescription 
          ? `${actorName} updated '${taskName}': ${details.changeDescription}`
          : `${actorName} updated '${taskName}'`;
        break;
      case 'WATCHER_ADDED':
        notificationText = `You are now watching '${taskName}'`;
        break;
      case 'WATCHER_REMOVED':
        notificationText = `You stopped watching '${taskName}'`;
        break;
      default:
        notificationText = `${actorName} updated '${taskName}'`;
    }

    // Create notifications for all recipients and send real-time events
    await Promise.all(
      uniqueRecipients.map(async (userId) => {
        await this.createNotification(userId, notificationText, 'task', taskId.toString());
      }),
    );
  }
}
