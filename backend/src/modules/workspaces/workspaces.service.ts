import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { CreateWorkspaceDto, UpdateWorkspaceDto, AddWorkspaceMemberDto, WorkspaceResponseDto, WorkspaceMemberResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateWorkspaceDto, userId: bigint): Promise<WorkspaceResponseDto> {
    const workspace = await this.prisma.workspace.create({
      data: { 
        name: dto.name, 
        description: dto.description, 
        tenantId: this.tenantContext.requireTenantId(),
        ownerId: userId 
      },
    });
    // Auto-add owner as member
    await this.prisma.workspaceMember.create({
      data: { workspaceId: workspace.workspaceId, userId, role: 'OWNER' },
    });
    return this.mapToResponse(workspace);
  }

  async findAll(userId: bigint): Promise<WorkspaceResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { 
        userId,
        workspace: {
          tenantId,
        },
      },
      include: { workspace: true },
    });
    return memberships.map((m) => this.mapToResponse(m.workspace));
  }

  async findById(workspaceId: string): Promise<WorkspaceResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const workspace = await this.prisma.workspace.findFirst({ 
      where: { 
        workspaceId: BigInt(workspaceId),
        tenantId,
      } 
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return this.mapToResponse(workspace);
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto, userId: bigint): Promise<WorkspaceResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const existing = await this.prisma.workspace.findFirst({ 
      where: { 
        workspaceId: BigInt(workspaceId),
        tenantId,
      } 
    });
    if (!existing) throw new NotFoundException('Workspace not found');

    // Check if user is a member with OWNER or ADMIN role
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: BigInt(workspaceId), 
        userId,
        workspace: {
          tenantId,
        },
      },
    });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Only workspace owners or admins can update the workspace');
    }

    const updated = await this.prisma.workspace.update({
      where: { workspaceId: BigInt(workspaceId) },
      data: { name: dto.name, description: dto.description },
    });
    return this.mapToResponse(updated);
  }

  async addMember(workspaceId: string, dto: AddWorkspaceMemberDto): Promise<WorkspaceMemberResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify workspace belongs to tenant
    const workspace = await this.prisma.workspace.findFirst({
      where: { workspaceId: BigInt(workspaceId), tenantId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const exists = await this.prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: BigInt(workspaceId), 
        userId: BigInt(dto.userId),
        workspace: {
          tenantId,
        },
      },
    });
    if (exists) throw new ConflictException('User is already a member');
    
    const member = await this.prisma.workspaceMember.create({
      data: { workspaceId: BigInt(workspaceId), userId: BigInt(dto.userId), role: dto.role || 'MEMBER' },
      include: { user: true },
    });
    return {
      id: member.id.toString(),
      userId: member.userId.toString(),
      username: member.user.username,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMemberResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const members = await this.prisma.workspaceMember.findMany({
      where: { 
        workspaceId: BigInt(workspaceId) ,
        workspace: {
          tenantId,
        },
      },
      include: { user: true },
    });
    return members.map((m) => ({
      id: m.id.toString(),
      userId: m.userId.toString(),
      username: m.user.username,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const member = await this.prisma.workspaceMember.findFirst({
      where: { 
        workspaceId: BigInt(workspaceId), 
        userId: BigInt(userId),
        workspace: {
          tenantId,
        },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === 'OWNER') throw new BadRequestException('Cannot remove workspace owner');
    await this.prisma.workspaceMember.delete({ where: { id: member.id } });
  }

  async delete(workspaceId: string, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const workspace = await this.prisma.workspace.findFirst({
      where: { 
        workspaceId: BigInt(workspaceId),
        tenantId,
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    // Only owner can delete workspace
    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only workspace owner can delete the workspace');
    }

    // Delete workspace (members will cascade due to onDelete: Cascade in schema)
    await this.prisma.workspace.delete({
      where: { workspaceId: BigInt(workspaceId) },
    });
  }

  private mapToResponse(w: { workspaceId: bigint; name: string; description: string | null; ownerId: bigint; createdAt: Date }): WorkspaceResponseDto {
    return {
      workspaceId: w.workspaceId.toString(),
      name: w.name,
      description: w.description,
      ownerId: w.ownerId.toString(),
      createdAt: w.createdAt.toISOString(),
    };
  }
}
