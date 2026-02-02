import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class TaskStatusesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: Prisma.TaskStatusUncheckedCreateInput): Promise<TaskStatus> {
    return this.prisma.taskStatus.create({ data });
  }

  async findById(statusId: bigint): Promise<TaskStatus | null> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskStatus.findFirst({
      where: {
        statusId,
        OR: [
          { tenantId },
          { tenantId: null }, // System templates are visible to all
        ],
      },
    });
  }

  async findByCode(projectId: bigint | null, departmentId: bigint | null, code: string): Promise<TaskStatus | null> {
    const tenantId = this.tenantContext.requireTenantId();
    const where: any = {
      code,
      OR: [
        { tenantId },
        { tenantId: null },
      ],
    };
    
    // Explicitly handle nulls for unique constraints
    if (projectId) where.projectId = projectId;
    else where.projectId = null;

    if (departmentId) where.departmentId = departmentId;
    else where.departmentId = null;

    return this.prisma.taskStatus.findFirst({ where });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.TaskStatusWhereInput;
    orderBy?: Prisma.TaskStatusOrderByWithRelationInput | Prisma.TaskStatusOrderByWithRelationInput[];
  }): Promise<TaskStatus[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const { skip, take, where, orderBy } = params;
    return this.prisma.taskStatus.findMany({
      skip,
      take,
      where: {
        ...where,
        OR: [
          { tenantId },
          { tenantId: null },
        ],
      },
      orderBy: orderBy || { sortOrder: 'asc' },
    });
  }

  async count(where?: Prisma.TaskStatusWhereInput): Promise<number> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskStatus.count({ 
      where: {
        ...where,
        OR: [
          { tenantId },
          { tenantId: null },
        ],
      },
    });
  }

  async update(statusId: bigint, data: Prisma.TaskStatusUpdateInput): Promise<TaskStatus> {
    const tenantId = this.tenantContext.requireTenantId();
    // Verify ownership before updating
    const status = await this.prisma.taskStatus.findFirst({
      where: { statusId, tenantId },
    });
    if (!status) throw new Error('Status not found in this tenant');

    return this.prisma.taskStatus.update({
      where: { statusId },
      data,
    });
  }

  async delete(statusId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    // Verify ownership before deleting
    const status = await this.prisma.taskStatus.findFirst({
      where: { statusId, tenantId },
    });
    if (!status) throw new Error('Status not found in this tenant');

    await this.prisma.taskStatus.delete({
      where: { statusId },
    });
  }

  async updateMany(
    where: Prisma.TaskStatusWhereInput,
    data: Prisma.TaskStatusUpdateInput,
  ): Promise<Prisma.BatchPayload> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskStatus.updateMany({ 
      where: {
        ...where,
        tenantId,
      }, 
      data 
    });
  }

  async createDefaultStatuses(projectId: bigint | null, departmentId: bigint | null = null): Promise<TaskStatus[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const defaultStatuses = [
      { name: 'Not Started', code: 'TODO', color: '#64748B', sortOrder: 0, isDefault: true },
      { name: 'In Progress', code: 'IN_PROGRESS', color: '#10B981', sortOrder: 1, isDefault: false },
      { name: 'In Review', code: 'IN_REVIEW', color: '#FBBF24', sortOrder: 2, isDefault: false },
      { name: 'Completed', code: 'DONE', color: '#f1184c', sortOrder: 3, isDefault: false, isTerminal: true },
      { name: 'Failed', code: 'FAILED', color: '#F97316', sortOrder: 4, isDefault: false, isTerminal: true },
      { name: 'Cancelled', code: 'CANCELLED', color: '#EF4444', sortOrder: 5, isDefault: false, isTerminal: true },
    ];

    // Use transaction to ensure atomicity - all or nothing
    return this.prisma.$transaction(async (tx) => {
      const createdStatuses: TaskStatus[] = [];
      for (const status of defaultStatuses) {
        const created = await tx.taskStatus.create({
          data: {
            ...status,
            tenantId,
            projectId,
            departmentId,
          },
        });
        createdStatuses.push(created);
      }
      return createdStatuses;
    });
  }
}
