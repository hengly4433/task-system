import { Injectable, NotFoundException, ConflictException, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { WatchersRepository } from './watchers.repository';
import { WatchersMapper } from './watchers.mapper';
import { WatcherResponseDto } from './dto';
import { PrismaService } from '../../common/database';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class WatchersService {
  constructor(
    private readonly watchersRepository: WatchersRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findByTask(taskId: string): Promise<WatcherResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const taskIdBigInt = BigInt(taskId);
    
    // Verify task exists in tenant
    const task = await this.prisma.task.findFirst({
      where: { 
        taskId: taskIdBigInt,
        project: {
          tenantId,
        },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found in this tenant');
    }

    const watchers = await this.watchersRepository.findByTask(taskIdBigInt);
    return WatchersMapper.toResponseList(watchers);
  }

  async addWatcher(taskId: string, userId: string, actorUserId?: bigint): Promise<WatcherResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const taskIdBigInt = BigInt(taskId);
    const userIdBigInt = BigInt(userId);

    // Verify task exists in tenant
    const task = await this.prisma.task.findFirst({
      where: { 
        taskId: taskIdBigInt,
        project: {
          tenantId,
        },
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found in this tenant');
    }

    // Verify user belongs to tenant
    const userMember = await this.prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: { tenantId, userId: userIdBigInt },
      },
    });
    if (!userMember) {
      throw new ForbiddenException('User is not a member of this tenant');
    }

    // Check if already watching
    const exists = await this.watchersRepository.exists(taskIdBigInt, userIdBigInt);
    if (exists) {
      throw new ConflictException('User is already watching this task');
    }

    const watcher = await this.watchersRepository.add(taskIdBigInt, userIdBigInt);

    // Notify the user that they are now watching the task
    await this.notificationsService.createNotification(
      userIdBigInt,
      `You are now watching '${task.taskName}'`,
      'task',
      taskId,
    );

    return WatchersMapper.toResponse(watcher);
  }

  async removeWatcher(taskId: string, userId: string, actorUserId?: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const taskIdBigInt = BigInt(taskId);
    const userIdBigInt = BigInt(userId);

    const exists = await this.watchersRepository.exists(taskIdBigInt, userIdBigInt);
    if (!exists) {
      throw new NotFoundException('Watcher not found');
    }

    // Get task name before removing for notification
    const task = await this.prisma.task.findFirst({
      where: { 
        taskId: taskIdBigInt,
        project: {
          tenantId,
        },
      },
    });

    await this.watchersRepository.remove(taskIdBigInt, userIdBigInt);

    // Notify the user that they stopped watching the task
    if (task) {
      await this.notificationsService.createNotification(
        userIdBigInt,
        `You stopped watching '${task.taskName}'`,
        'task',
        taskId,
      );
    }
  }

  async getWatcherCount(taskId: string): Promise<number> {
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

    return this.watchersRepository.countByTask(BigInt(taskId));
  }
}
