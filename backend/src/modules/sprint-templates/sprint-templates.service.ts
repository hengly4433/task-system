import { Injectable, NotFoundException } from '@nestjs/common';
import { SprintTemplatesRepository } from './sprint-templates.repository';
import { CreateSprintTemplateDto, UpdateSprintTemplateDto, ListSprintTemplatesQueryDto, SprintTemplateResponseDto } from './dto';
import { SprintTemplatesMapper } from './sprint-templates.mapper';
import { PaginatedResult, createPaginatedResult, getPaginationParams } from '../../common/pagination';
import { TenantContextService } from '../../common/tenant';
import { PrismaService } from '../../common/database';

@Injectable()
export class SprintTemplatesService {
  constructor(
    private readonly repository: SprintTemplatesRepository,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateSprintTemplateDto): Promise<SprintTemplateResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify department belongs to tenant
    const department = await this.prisma.department.findFirst({
      where: { departmentId: BigInt(dto.departmentId), tenantId },
    });
    if (!department) throw new NotFoundException('Department not found in this tenant');

    // If this is set as default, unset other defaults in the same department
    if (dto.isDefault) {
      await this.repository.updateMany(
        { departmentId: BigInt(dto.departmentId), isDefault: true },
        { isDefault: false }
      );
    }

    const template = await this.repository.create({
      name: dto.name,
      namePattern: dto.namePattern || null,
      durationDays: dto.durationDays || 14,
      goalTemplate: dto.goalTemplate || null,
      isDefault: dto.isDefault || false,
      department: { connect: { departmentId: BigInt(dto.departmentId) } },
    });

    return SprintTemplatesMapper.toResponse(template);
  }

  async findById(templateId: string): Promise<SprintTemplateResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const template = await this.prisma.sprintTemplate.findFirst({
      where: { 
        templateId: BigInt(templateId),
        department: {
          tenantId,
        },
      },
      include: {
        department: true,
      }
    });
    if (!template) {
      throw new NotFoundException('Sprint template not found in this tenant');
    }
    return SprintTemplatesMapper.toResponse(template);
  }

  async findAll(query: ListSprintTemplatesQueryDto): Promise<PaginatedResult<SprintTemplateResponseDto>> {
    const tenantId = this.tenantContext.requireTenantId();
    const { skip, take } = getPaginationParams(query);

    const where: any = {
      department: {
        tenantId,
      },
    };
    
    if (query.departmentId) {
      where.departmentId = BigInt(query.departmentId);
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { namePattern: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [templates, totalItems] = await Promise.all([
      this.repository.findMany({ skip, take, where, orderBy: { isDefault: 'desc' } }),
      this.repository.count(where),
    ]);

    return createPaginatedResult(SprintTemplatesMapper.toResponseList(templates), totalItems, query);
  }

  async findByDepartment(departmentId: string): Promise<SprintTemplateResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify department belongs to tenant
    const department = await this.prisma.department.findFirst({
      where: { departmentId: BigInt(departmentId), tenantId },
    });
    if (!department) throw new NotFoundException('Department not found in this tenant');

    const templates = await this.repository.findByDepartment(BigInt(departmentId));
    return SprintTemplatesMapper.toResponseList(templates);
  }

  async update(templateId: string, dto: UpdateSprintTemplateDto): Promise<SprintTemplateResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.sprintTemplate.findFirst({
      where: {
        templateId: BigInt(templateId),
        department: {
          tenantId,
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('Sprint template not found in this tenant');
    }

    // If setting as default, unset other defaults in the same department
    if (dto.isDefault && !existing.isDefault) {
      await this.repository.updateMany(
        { departmentId: existing.departmentId, isDefault: true },
        { isDefault: false }
      );
    }

    const updated = await this.repository.update(BigInt(templateId), {
      ...(dto.name && { name: dto.name }),
      ...(dto.namePattern !== undefined && { namePattern: dto.namePattern }),
      ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
      ...(dto.goalTemplate !== undefined && { goalTemplate: dto.goalTemplate }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
    });

    return SprintTemplatesMapper.toResponse(updated);
  }

  async delete(templateId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const template = await this.prisma.sprintTemplate.findFirst({
      where: {
        templateId: BigInt(templateId),
        department: {
          tenantId,
        },
      },
    });
    if (!template) {
      throw new NotFoundException('Sprint template not found in this tenant');
    }

    await this.repository.delete(BigInt(templateId));
  }
}
