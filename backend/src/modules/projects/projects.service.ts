import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ListProjectsQueryDto,
  ProjectResponseDto,
  ProjectMemberResponseDto,
} from './dto';
import { ProjectsMapper } from './projects.mapper';
import { AuditService } from '../../common/audit';
import { PaginatedResult, createPaginatedResult, getPaginationParams, getSortParams } from '../../common/pagination';
import { TenantContextService } from '../../common/tenant';
import { SubscriptionService } from '../../common/subscription';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async create(dto: CreateProjectDto, userId: bigint): Promise<ProjectResponseDto> {
    // Check subscription limit before creating a project
    await this.subscriptionService.checkProjectLimit();

    const project = await this.projectsRepository.create({
      projectName: dto.projectName,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      tenant: { connect: { tenantId: this.tenantContext.requireTenantId() } },
      owner: { connect: { userId } },
      creator: { connect: { userId } },
      ...(dto.teamId && { team: { connect: { teamId: BigInt(dto.teamId) } } }),
      ...(dto.workspaceId && { workspace: { connect: { workspaceId: BigInt(dto.workspaceId) } } }),
      ...(dto.departmentId && { department: { connect: { departmentId: BigInt(dto.departmentId) } } }),
    });

    await this.auditService.logActivity({
      userId,
      activityType: 'PROJECT_CREATED',
      details: `Created project: ${project.projectName}`,
    });

    return ProjectsMapper.toResponse(project);
  }

  async findById(projectId: string): Promise<ProjectResponseDto> {
    const project = await this.projectsRepository.findById(
      BigInt(projectId),
      this.tenantContext.requireTenantId(),
    );
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return ProjectsMapper.toResponse(project);
  }

  async findAll(query: ListProjectsQueryDto): Promise<PaginatedResult<ProjectResponseDto>> {
    const { skip, take } = getPaginationParams(query);
    const { orderBy } = getSortParams(query, ['projectName', 'createdAt', 'startDate']);

    const where = {
      tenantId: this.tenantContext.requireTenantId(),
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.ownerId ? { ownerId: BigInt(query.ownerId) } : {}),
      ...(query.workspaceId ? { workspaceId: BigInt(query.workspaceId) } : {}),
      ...(query.search
        ? { projectName: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [projects, totalItems] = await Promise.all([
      this.projectsRepository.findMany({ skip, take, where, orderBy }),
      this.projectsRepository.count(where),
    ]);

    return createPaginatedResult(ProjectsMapper.toResponseListWithCounts(projects), totalItems, query);
  }

  async update(projectId: string, dto: UpdateProjectDto, userId: bigint): Promise<ProjectResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.projectsRepository.findById(BigInt(projectId), tenantId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updatedProject = await this.projectsRepository.update(BigInt(projectId), tenantId, {
      ...(dto.projectName && { projectName: dto.projectName }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      ...(dto.ownerId && { owner: { connect: { userId: BigInt(dto.ownerId) } } }),
      ...(dto.teamId && { team: { connect: { teamId: BigInt(dto.teamId) } } }),
      ...(dto.workspaceId !== undefined && {
        workspace: dto.workspaceId
          ? { connect: { workspaceId: BigInt(dto.workspaceId) } }
          : { disconnect: true },
      }),
      // Handle department update if needed (although usually set creation)
      // Assuming UpdateProjectDto might not have departmentId yet, but if it does:
      ...(dto.departmentId !== undefined && {
        department: dto.departmentId
          ? { connect: { departmentId: BigInt(dto.departmentId) } }
          : { disconnect: true },
      }),
    });

    await this.auditService.logActivity({
      userId,
      activityType: 'PROJECT_UPDATED',
      details: `Updated project: ${updatedProject.projectName}`,
    });

    return ProjectsMapper.toResponse(updatedProject);
  }

  async softDelete(projectId: string, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.projectsRepository.findById(BigInt(projectId), tenantId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.projectsRepository.softDelete(BigInt(projectId), tenantId);

    await this.auditService.logActivity({
      userId,
      activityType: 'PROJECT_DELETED',
      details: `Deleted project: ${project.projectName}`,
    });
  }

  async addMember(projectId: string, userId: string, addedByUserId: bigint): Promise<ProjectMemberResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.projectsRepository.findById(BigInt(projectId), tenantId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify the user being added belongs to this tenant
    const userMembership = await this.projectsRepository.verifyUserInTenant(BigInt(userId), tenantId);
    if (!userMembership) {
      throw new NotFoundException('User not found in this organization');
    }

    const existing = await this.projectsRepository.findMember(BigInt(projectId), BigInt(userId));
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = await this.projectsRepository.addMember(BigInt(projectId), BigInt(userId));

    await this.auditService.logActivity({
      userId: addedByUserId,
      activityType: 'PROJECT_MEMBER_ADDED',
      details: `Added member ${userId} to project ${project.projectName}`,
    });

    return ProjectsMapper.memberToResponse(member);
  }

  async removeMember(projectId: string, userId: string, removedByUserId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.projectsRepository.findById(BigInt(projectId), tenantId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify the user belongs to this tenant before removing
    const userMembership = await this.projectsRepository.verifyUserInTenant(BigInt(userId), tenantId);
    if (!userMembership) {
      throw new NotFoundException('User not found in this organization');
    }

    await this.projectsRepository.removeMember(BigInt(projectId), BigInt(userId));

    await this.auditService.logActivity({
      userId: removedByUserId,
      activityType: 'PROJECT_MEMBER_REMOVED',
      details: `Removed member ${userId} from project ${project.projectName}`,
    });
  }

  async getMembers(projectId: string): Promise<ProjectMemberResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.projectsRepository.findById(BigInt(projectId), tenantId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const members = await this.projectsRepository.findMembers(BigInt(projectId));
    return members.map((m) => ProjectsMapper.memberToResponse(m));
  }
}
