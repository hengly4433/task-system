import { Injectable, NotFoundException } from '@nestjs/common';
import { MilestonesRepository } from './milestones.repository';
import { CreateMilestoneDto, UpdateMilestoneDto, MilestoneResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly repo: MilestonesRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateMilestoneDto): Promise<MilestoneResponseDto> {
    this.tenantContext.requireTenantId();
    const milestone = await this.repo.create({
      projectId: BigInt(dto.projectId),
      milestoneName: dto.milestoneName,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null
    });
    return this.mapToResponse(milestone);
  }

  async findAll(): Promise<MilestoneResponseDto[]> {
    this.tenantContext.requireTenantId();
    const milestones = await this.repo.findAll();
    return milestones.map(m => this.mapToResponse(m));
  }

  async findById(id: string): Promise<MilestoneResponseDto> {
    this.tenantContext.requireTenantId();
    const milestone = await this.repo.findById(BigInt(id));
    if (!milestone) throw new NotFoundException('Milestone not found in this tenant');
    return this.mapToResponse(milestone);
  }

  async findByProject(projectId: string): Promise<MilestoneResponseDto[]> {
    this.tenantContext.requireTenantId();
    const milestones = await this.repo.findByProject(BigInt(projectId));
    return milestones.map(m => this.mapToResponse(m));
  }

  async update(id: string, dto: UpdateMilestoneDto): Promise<MilestoneResponseDto> {
    this.tenantContext.requireTenantId();
    const milestone = await this.repo.update(BigInt(id), {
      milestoneName: dto.milestoneName,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined
    });
    return this.mapToResponse(milestone);
  }

  async delete(id: string) {
    this.tenantContext.requireTenantId();
    return this.repo.delete(BigInt(id));
  }

  private mapToResponse(milestone: any): MilestoneResponseDto {
    return {
      milestoneId: milestone.milestoneId.toString(),
      projectId: milestone.projectId.toString(),
      milestoneName: milestone.milestoneName,
      dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
      createdAt: milestone.createdAt.toISOString()
    };
  }
}
