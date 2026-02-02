import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class DependenciesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(taskId: bigint, dependentTaskId: bigint) {
    return this.prisma.taskDependency.create({
      data: { taskId, dependentTaskId },
    });
  }

  async findByTask(taskId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskDependency.findMany({
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

  async findById(dependencyId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskDependency.findFirst({
      where: { 
        dependencyId,
        task: {
          project: {
            tenantId,
          },
        },
      },
    });
  }

  async delete(dependencyId: bigint) {
    // Verification should be done in service before calling this
    return this.prisma.taskDependency.delete({
      where: { dependencyId },
    });
  }

  async exists(taskId: bigint, dependentTaskId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    const dep = await this.prisma.taskDependency.findFirst({
      where: { 
        taskId, 
        dependentTaskId,
        task: {
          project: {
            tenantId,
          },
        },
      },
    });
    return dep !== null;
  }

  async getAllDependenciesForCycleCheck() {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.taskDependency.findMany({
      where: {
        task: {
          project: {
            tenantId,
          },
        },
      },
      select: { taskId: true, dependentTaskId: true },
    });
  }
}
