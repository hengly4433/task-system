import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TaskStatusesRepository } from './task-statuses.repository';
import { CreateTaskStatusDto, UpdateTaskStatusDto, ListTaskStatusesQueryDto, TaskStatusResponseDto } from './dto';

import { TaskStatusesMapper } from './task-statuses.mapper';
import { PaginatedResult, createPaginatedResult, getPaginationParams } from '../../common/pagination';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class TaskStatusesService {
  constructor(
    private readonly repository: TaskStatusesRepository,
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateTaskStatusDto): Promise<TaskStatusResponseDto> {
    // Validate scope (only one or the other)
    if (dto.projectId && dto.departmentId) {
      throw new BadRequestException('Cannot assign status to both Project and Department');
    }

    const tenantId = this.tenantContext.requireTenantId();

    // Verify project/department belongs to tenant
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { projectId: BigInt(dto.projectId), tenantId },
      });
      if (!project) throw new NotFoundException('Project not found in this tenant');
    }
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { departmentId: BigInt(dto.departmentId), tenantId },
      });
      if (!dept) throw new NotFoundException('Department not found in this tenant');
    }

    // Check if code already exists for this scope
    const existingStatus = await this.repository.findByCode(
      dto.projectId ? BigInt(dto.projectId) : null,
      dto.departmentId ? BigInt(dto.departmentId) : null,
      dto.code,
    );
    if (existingStatus) {
      throw new ConflictException(`Status with code "${dto.code}" already exists in this scope`);
    }

    // If this is set as default, unset other defaults in the same scope
    if (dto.isDefault) {
      const where: any = { isDefault: true, tenantId };
      if (dto.projectId) where.projectId = BigInt(dto.projectId);
      else where.projectId = null;
      
      if (dto.departmentId) where.departmentId = BigInt(dto.departmentId);
      else where.departmentId = null;

      await this.repository.updateMany(where, { isDefault: false });
    }

    const status = await this.repository.create({
      name: dto.name,
      code: dto.code,
      color: dto.color || '#64748B',
      sortOrder: dto.sortOrder || 0,
      isDefault: dto.isDefault || false,
      tenantId,
      projectId: dto.projectId ? BigInt(dto.projectId) : null,
      departmentId: dto.departmentId ? BigInt(dto.departmentId) : null,
    });

    return TaskStatusesMapper.toResponse(status);
  }

  async findById(statusId: string): Promise<TaskStatusResponseDto> {
    const status = await this.repository.findById(BigInt(statusId));
    if (!status) {
      throw new NotFoundException('Status not found');
    }
    return TaskStatusesMapper.toResponse(status);
  }

  async findAll(query: ListTaskStatusesQueryDto): Promise<PaginatedResult<TaskStatusResponseDto>> {
    const tenantId = this.tenantContext.requireTenantId();
    const { skip, take } = getPaginationParams(query);

    const where: any = {
      OR: [
        { tenantId },
        { tenantId: null },
      ],
    };
    
    // Filter by project (null means global/template statuses)
    if (query.projectId) {
      where.projectId = BigInt(query.projectId);
    }
    if (query.departmentId) {
      where.departmentId = BigInt(query.departmentId);
    }

    if (query.search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [statuses, totalItems] = await Promise.all([
      this.repository.findMany({ skip, take, where, orderBy: { sortOrder: 'asc' } }),
      this.repository.count(where),
    ]);

    return createPaginatedResult(TaskStatusesMapper.toResponseList(statuses), totalItems, query);
  }

  async getStatusesByProject(projectId?: string): Promise<TaskStatusResponseDto[]> {
    if (!projectId) return [];
    const tenantId = this.tenantContext.requireTenantId();
    
    // 1. Try to find Project-specific statuses
    const projectStatuses = await this.repository.findMany({ 
      where: {
        projectId: BigInt(projectId),
        tenantId,
      }, 
      orderBy: { sortOrder: 'asc' } 
    });
    
    if (projectStatuses.length > 0) {
      return TaskStatusesMapper.toResponseList(projectStatuses);
    }

    // 2. If no project statuses, check Department statuses
    const project = await this.prisma.project.findFirst({
      where: { projectId: BigInt(projectId), tenantId },
      select: { departmentId: true },
    });

    if (project?.departmentId) {
      const deptStatuses = await this.repository.findMany({
        where: { departmentId: project.departmentId, projectId: null, tenantId },
        orderBy: { sortOrder: 'asc' }
      });
      
      if (deptStatuses.length > 0) {
        return TaskStatusesMapper.toResponseList(deptStatuses);
      }
    }
    
    // 3. Fallback: Create Defaults for Project
    const created = await this.repository.createDefaultStatuses(BigInt(projectId), project?.departmentId ?? null);
    return TaskStatusesMapper.toResponseList(created);
  }

  async update(statusId: string, dto: UpdateTaskStatusDto): Promise<TaskStatusResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.repository.findById(BigInt(statusId));
    if (!existing) {
      throw new NotFoundException('Status not found');
    }

    // Check if code update conflicts with existing status
    if (dto.code && dto.code !== existing.code) {
      const conflicting = await this.repository.findByCode(
        existing.projectId,
        existing.departmentId,
        dto.code,
      );
      if (conflicting && conflicting.statusId !== existing.statusId) {
        throw new ConflictException(`Status with code "${dto.code}" already exists`);
      }
    }

    // If setting as default, unset other defaults
    if (dto.isDefault && !existing.isDefault) {
      const where: any = { isDefault: true, tenantId };
      if (existing.projectId) where.projectId = existing.projectId;
      else where.projectId = null;

      if (existing.departmentId) where.departmentId = existing.departmentId;
      else where.departmentId = null;

      await this.repository.updateMany(where, { isDefault: false });
    }

    const updated = await this.repository.update(BigInt(statusId), {
      ...(dto.name && { name: dto.name }),
      ...(dto.code && { code: dto.code }),
      ...(dto.color && { color: dto.color }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
    });

    return TaskStatusesMapper.toResponse(updated);
  }

  async delete(statusId: string): Promise<void> {
    const status = await this.repository.findById(BigInt(statusId));
    if (!status) {
      throw new NotFoundException('Status not found');
    }

    // Don't allow deleting the default status
    if (status.isDefault) {
      throw new BadRequestException('Cannot delete the default status. Set another status as default first.');
    }

    await this.repository.delete(BigInt(statusId));
  }

  async reorder(statusIds: string[]): Promise<TaskStatusResponseDto[]> {
    const updates: Promise<any>[] = [];
    
    for (let i = 0; i < statusIds.length; i++) {
      updates.push(
        this.repository.update(BigInt(statusIds[i]), { sortOrder: i }),
      );
    }

    await Promise.all(updates);
    
    // Return updated list
    if (statusIds.length === 0) return [];
    
    const first = await this.repository.findById(BigInt(statusIds[0]));
    if (!first) return [];

    return this.getStatusesByProject(first.projectId?.toString());
  }

  async initializeDefaultStatuses(projectId: string): Promise<TaskStatusResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.repository.findMany({
      where: { projectId: BigInt(projectId), tenantId },
    });

    if (existing.length > 0) {
      return TaskStatusesMapper.toResponseList(existing);
    }

    const created = await this.repository.createDefaultStatuses(BigInt(projectId), null);
    return TaskStatusesMapper.toResponseList(created);
  }
}
