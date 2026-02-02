import { Injectable } from '@nestjs/common';
import { Project, ProjectMember, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database';

export interface FindManyProjectsParams {
  skip?: number;
  take?: number;
  where?: Prisma.ProjectWhereInput;
  orderBy?: Prisma.ProjectOrderByWithRelationInput;
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  async findById(projectId: bigint, tenantId: bigint, includeDeleted = false): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: {
        projectId,
        tenantId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findMany(params: FindManyProjectsParams): Promise<(Project & { _count: { tasks: number }; completedTaskCount: number })[]> {
    const projects = await this.prisma.project.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    // Get completed task counts for each project
    const projectIds = projects.map(p => p.projectId);
    const completedCounts = await this.prisma.task.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
        status: { in: ['DONE', 'COMPLETED'] },
      },
      _count: { taskId: true },
    });

    const completedCountMap = new Map<bigint, number>();
    completedCounts.forEach(c => {
      completedCountMap.set(c.projectId, c._count.taskId);
    });

    return projects.map(p => ({
      ...p,
      completedTaskCount: completedCountMap.get(p.projectId) || 0,
    }));
  }

  async count(where?: Prisma.ProjectWhereInput): Promise<number> {
    return this.prisma.project.count({ where });
  }

  async update(projectId: bigint, tenantId: bigint, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return this.prisma.project.update({
      where: { projectId, tenantId },
      data,
    });
  }

  async softDelete(projectId: bigint, tenantId: bigint): Promise<Project> {
    return this.prisma.project.update({
      where: { projectId, tenantId },
      data: { deletedAt: new Date() },
    });
  }

  async addMember(projectId: bigint, userId: bigint): Promise<ProjectMember> {
    return this.prisma.projectMember.create({
      data: { projectId, userId },
    });
  }

  async removeMember(projectId: bigint, userId: bigint): Promise<void> {
    await this.prisma.projectMember.deleteMany({
      where: { projectId, userId },
    });
  }

  async findMember(projectId: bigint, userId: bigint): Promise<ProjectMember | null> {
    return this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
  }

  async findMembers(projectId: bigint): Promise<ProjectMember[]> {
    return this.prisma.projectMember.findMany({
      where: { projectId },
    });
  }

  async verifyUserInTenant(userId: bigint, tenantId: bigint): Promise<boolean> {
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    return !!membership;
  }
}
