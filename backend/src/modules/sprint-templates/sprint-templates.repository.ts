import { Injectable } from '@nestjs/common';
import { Prisma, SprintTemplate } from '@prisma/client';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class SprintTemplatesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: Prisma.SprintTemplateCreateInput): Promise<SprintTemplate> {
    return this.prisma.sprintTemplate.create({ data });
  }

  async findById(templateId: bigint): Promise<SprintTemplate | null> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.sprintTemplate.findFirst({
      where: { 
        templateId,
        department: {
          tenantId,
        },
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SprintTemplateWhereInput;
    orderBy?: Prisma.SprintTemplateOrderByWithRelationInput;
  }): Promise<SprintTemplate[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const { skip, take, where, orderBy } = params;
    return this.prisma.sprintTemplate.findMany({
      skip,
      take,
      where: {
        ...where,
        department: {
          tenantId,
        },
      },
      orderBy: orderBy || { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.SprintTemplateWhereInput): Promise<number> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.sprintTemplate.count({ 
      where: {
        ...where,
        department: {
          tenantId,
        },
      },
    });
  }

  async update(templateId: bigint, data: Prisma.SprintTemplateUpdateInput): Promise<SprintTemplate> {
    // Verification should be done in service
    return this.prisma.sprintTemplate.update({
      where: { templateId },
      data,
    });
  }

  async updateMany(where: Prisma.SprintTemplateWhereInput, data: Prisma.SprintTemplateUpdateInput): Promise<number> {
    const tenantId = this.tenantContext.requireTenantId();
    const result = await this.prisma.sprintTemplate.updateMany({ 
      where: {
        ...where,
        department: {
          tenantId,
        },
      }, 
      data 
    });
    return result.count;
  }

  async delete(templateId: bigint): Promise<void> {
    await this.prisma.sprintTemplate.delete({
      where: { templateId },
    });
  }

  async findByDepartment(departmentId: bigint): Promise<SprintTemplate[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.sprintTemplate.findMany({
      where: { 
        departmentId,
        department: {
          tenantId,
        },
      },
      orderBy: { isDefault: 'desc' },
    });
  }

  async findDefaultByDepartment(departmentId: bigint): Promise<SprintTemplate | null> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.sprintTemplate.findFirst({
      where: { 
        departmentId, 
        isDefault: true,
        department: {
          tenantId,
        },
      },
    });
  }
}
