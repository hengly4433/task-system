import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Prisma } from '@prisma/client';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class MilestonesRepository {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  async create(data: Prisma.MilestoneUncheckedCreateInput) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { projectId: data.projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Project not found in this tenant');

    return this.prisma.milestone.create({ data });
  }

  async findAll() {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.milestone.findMany({
      where: {
        project: {
          tenantId,
        },
      },
    });
  }

  async findById(milestoneId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.milestone.findFirst({ 
      where: { 
        milestoneId,
        project: {
          tenantId,
        },
      },
    });
  }

  async findByProject(projectId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.milestone.findMany({
      where: { 
        projectId,
        project: {
          tenantId,
        },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async update(milestoneId: bigint, data: Prisma.MilestoneUpdateInput) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify ownership
    const milestone = await this.findById(milestoneId);
    if (!milestone) throw new NotFoundException('Milestone not found in this tenant');

    return this.prisma.milestone.update({
      where: { milestoneId },
      data
    });
  }

  async delete(milestoneId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify ownership
    const milestone = await this.findById(milestoneId);
    if (!milestone) throw new NotFoundException('Milestone not found in this tenant');

    return this.prisma.milestone.delete({ where: { milestoneId } });
  }
}
