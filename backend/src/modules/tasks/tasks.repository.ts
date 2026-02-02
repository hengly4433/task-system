import { Injectable } from '@nestjs/common';
import { Task, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database';

export interface FindManyTasksParams {
  skip?: number;
  take?: number;
  where?: Prisma.TaskWhereInput;
  orderBy?: Prisma.TaskOrderByWithRelationInput;
}

const taskIncludes = {
  assignee: true,
  tester: true,
  creator: true,
  parent: { select: { taskId: true, taskName: true } },
  project: true,
  sprint: true,
  assignedTeam: true,
  milestone: true,
  _count: { select: { watchers: true } },
};

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.TaskCreateInput): Promise<Task> {
    return this.prisma.task.create({ 
      data,
      include: taskIncludes,
    });
  }

  async findById(taskId: bigint, tenantId: bigint, includeDeleted = false): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: {
        taskId,
        project: { tenantId },
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: taskIncludes,
    });
  }

  async findMany(params: FindManyTasksParams): Promise<Task[]> {
    return this.prisma.task.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: taskIncludes,
    });
  }

  async count(where?: Prisma.TaskWhereInput): Promise<number> {
    return this.prisma.task.count({ where });
  }

  async update(taskId: bigint, tenantId: bigint, data: Prisma.TaskUpdateInput): Promise<Task> {
    return this.prisma.task.update({
      where: { 
        taskId,
        project: { tenantId }
      },
      data,
      include: taskIncludes,
    });
  }

  async softDelete(taskId: bigint, tenantId: bigint): Promise<Task> {
    return this.prisma.task.update({
      where: { 
        taskId,
        project: { tenantId }
      },
      data: { deletedAt: new Date() },
    });
  }

  async findChildren(parentTaskId: bigint, tenantId: bigint): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { 
        parentTaskId, 
        deletedAt: null,
        project: { tenantId },
      },
      include: taskIncludes,
    });
  }
}
