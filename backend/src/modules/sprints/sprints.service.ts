import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { CreateSprintDto, UpdateSprintDto, SprintResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createDirect(dto: CreateSprintDto): Promise<SprintResponseDto> {
    if (!dto.projectId) {
      throw new BadRequestException('projectId is required');
    }
    return this.create(dto.projectId, dto);
  }

  async create(projectId: string, dto: CreateSprintDto): Promise<SprintResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: {
        projectId: BigInt(projectId),
        tenantId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found in this tenant');
    }

    const sprint = await this.prisma.sprint.create({
      data: {
        projectId: BigInt(projectId),
        sprintName: dto.sprintName,
        goal: dto.goal || null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status || 'PLANNING',
      },
    });
    return this.mapToResponse(sprint);
  }

  async findAll(): Promise<SprintResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const sprints = await this.prisma.sprint.findMany({
      where: {
        project: {
          tenantId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sprints.map((s) => this.mapToResponse(s));
  }

  async findByProject(projectId: string): Promise<SprintResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const sprints = await this.prisma.sprint.findMany({
      where: {
        projectId: BigInt(projectId),
        project: {
          tenantId,
        },
      },
      orderBy: { startDate: 'asc' },
    });
    return sprints.map((s) => this.mapToResponse(s));
  }

  async findById(id: string): Promise<SprintResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const sprint = await this.prisma.sprint.findFirst({
      where: {
        sprintId: BigInt(id),
        project: {
          tenantId,
        },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return this.mapToResponse(sprint);
  }

  async update(id: string, dto: UpdateSprintDto): Promise<SprintResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const sprint = await this.prisma.sprint.findFirst({
      where: {
        sprintId: BigInt(id),
        project: {
          tenantId,
        },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    const updated = await this.prisma.sprint.update({
      where: { sprintId: BigInt(id) },
      data: {
        ...(dto.sprintName && { sprintName: dto.sprintName }),
        ...(dto.goal !== undefined && { goal: dto.goal }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.status && { status: dto.status }),
      },
    });
    return this.mapToResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const sprint = await this.prisma.sprint.findFirst({
      where: {
        sprintId: BigInt(id),
        project: {
          tenantId,
        },
      },
      include: { project: { select: { tenantId: true } } },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    // Verify tenant matches before delete (defense-in-depth)
    if (sprint.project.tenantId !== tenantId) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.sprint.delete({
      where: { sprintId: BigInt(id) },
    });
  }

  async assignTask(taskId: string, sprintId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();

    const task = await this.prisma.task.findFirst({
      where: {
        taskId: BigInt(taskId),
        deletedAt: null,
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const sprint = await this.prisma.sprint.findFirst({
      where: {
        sprintId: BigInt(sprintId),
        project: {
          tenantId,
        },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.prisma.task.update({
      where: { taskId: BigInt(taskId) },
      data: { sprintId: BigInt(sprintId) },
    });
  }

  async createFromTemplate(projectId: string, templateId: string): Promise<SprintResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const template = await this.prisma.sprintTemplate.findFirst({
      where: {
        templateId: BigInt(templateId),
        department: {
          tenantId,
        },
      },
    });
    if (!template) throw new NotFoundException('Sprint template not found');

    // Calculate dates based on template duration
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + template.durationDays * 24 * 60 * 60 * 1000);

    // Generate sprint name from pattern
    const sprintCount = await this.prisma.sprint.count({
      where: {
        projectId: BigInt(projectId),
        project: {
          tenantId,
        },
      },
    });
    const sprintName = template.namePattern?.replace('{number}', String(sprintCount + 1))
      || `Sprint ${sprintCount + 1}`;

    return this.create(projectId, {
      sprintName,
      goal: template.goalTemplate || undefined,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'PLANNING',
    });
  }

  private mapToResponse(s: any): SprintResponseDto {
    return {
      sprintId: s.sprintId.toString(),
      projectId: s.projectId.toString(),
      sprintName: s.sprintName,
      goal: s.goal || null,
      startDate: s.startDate?.toISOString().split('T')[0] || null,
      endDate: s.endDate?.toISOString().split('T')[0] || null,
      status: s.status || null,
    };
  }
}

