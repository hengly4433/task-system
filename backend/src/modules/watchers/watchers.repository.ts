import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class WatchersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findByTask(taskId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskWatcher.findMany({
      where: { 
        taskId,
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(taskId: bigint, userId: bigint) {
    return this.prisma.taskWatcher.create({
      data: { taskId, userId },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  async remove(taskId: bigint, userId: bigint) {
    return this.prisma.taskWatcher.deleteMany({
      where: { taskId, userId },
    });
  }

  async exists(taskId: bigint, userId: bigint): Promise<boolean> {
    const tenantId = this.tenantContext.requireTenantId();
    const count = await this.prisma.taskWatcher.count({
      where: { 
        taskId, 
        userId,
        task: {
          project: {
            tenantId,
          },
        },
      },
    });
    return count > 0;
  }

  async countByTask(taskId: bigint): Promise<number> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskWatcher.count({
      where: { 
        taskId,
        task: {
          project: {
            tenantId,
          },
        },
      },
    });
  }
}
