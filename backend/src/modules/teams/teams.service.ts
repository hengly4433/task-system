import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class TeamsService {
  constructor(
    private prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateTeamDto) {
    // Create team with optional department
    const team = await this.prisma.team.create({
      data: {
        teamName: dto.teamName,
        tenant: { connect: { tenantId: this.tenantContext.requireTenantId() } },
        owner: { connect: { userId: BigInt(dto.ownerId) } },
        ...(dto.departmentId && {
          department: { connect: { departmentId: BigInt(dto.departmentId) } }
        }),
      },
      include: {
        owner: true,
        department: true,
        members: { include: { user: true } },
      },
    });

    // Add initial members if provided
    if (dto.memberIds && dto.memberIds.length > 0) {
      await Promise.all(
        dto.memberIds.map(userId =>
          this.prisma.teamMember.create({
            data: {
              teamId: team.teamId,
              userId: BigInt(userId),
            },
          })
        )
      );
    }

    return this.mapToResponse(team);
  }

  async findAll(departmentId?: string, search?: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        tenantId: this.tenantContext.requireTenantId(),
        ...(departmentId && { departmentId: BigInt(departmentId) }),
        ...(search && {
          teamName: { contains: search, mode: 'insensitive' as const },
        }),
      },
      include: {
        owner: true,
        department: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return teams.map(t => this.mapToResponse(t));
  }

  async findById(id: string) {
    const team = await this.prisma.team.findFirst({
      where: { 
        teamId: BigInt(id),
        tenantId: this.tenantContext.requireTenantId(),
      },
      include: {
        owner: true,
        department: true,
        members: {
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!team) throw new NotFoundException('Team not found');
    return this.mapToResponse(team);
  }

  async update(id: string, dto: UpdateTeamDto) {
    const tenantId = this.tenantContext.requireTenantId();
    const team = await this.prisma.team.findFirst({
      where: { teamId: BigInt(id), tenantId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const updated = await this.prisma.team.update({
      where: { teamId: BigInt(id), tenantId },
      data: {
        ...(dto.teamName && { teamName: dto.teamName }),
        ...(dto.departmentId !== undefined && {
          departmentId: dto.departmentId ? BigInt(dto.departmentId) : null,
        }),
      },
      include: {
        owner: true,
        department: true,
        members: { include: { user: true } },
      },
    });

    return this.mapToResponse(updated);
  }

  async delete(id: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const team = await this.prisma.team.findFirst({
      where: { teamId: BigInt(id), tenantId },
    });
    if (!team) throw new NotFoundException('Team not found');

    // Members will be cascade deleted due to onDelete: Cascade
    await this.prisma.team.delete({
      where: { teamId: BigInt(id), tenantId },
    });

    return { success: true, message: 'Team deleted successfully' };
  }

  // Member management
  async addMember(teamId: string, dto: AddTeamMemberDto) {
    const team = await this.prisma.team.findUnique({
      where: { teamId: BigInt(teamId) },
    });
    if (!team) throw new NotFoundException('Team not found');

    // Check if already a member
    const existing = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: BigInt(teamId),
          userId: BigInt(dto.userId),
        },
      },
    });
    if (existing) throw new ConflictException('User is already a team member');

    await this.prisma.teamMember.create({
      data: {
        teamId: BigInt(teamId),
        userId: BigInt(dto.userId),
      },
    });

    return this.findById(teamId);
  }

  async removeMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: BigInt(teamId),
          userId: BigInt(userId),
        },
      },
    });
    if (!member) throw new NotFoundException('Team member not found');

    await this.prisma.teamMember.delete({
      where: { teamMemberId: member.teamMemberId },
    });

    return this.findById(teamId);
  }

  private mapToResponse(team: any) {
    return {
      teamId: team.teamId.toString(),
      teamName: team.teamName,
      ownerId: team.ownerId.toString(),
      departmentId: team.departmentId?.toString() || null,
      createdAt: team.createdAt,
      owner: team.owner ? {
        userId: team.owner.userId.toString(),
        username: team.owner.username,
        fullName: team.owner.fullName,
        email: team.owner.email,
        profileImageUrl: team.owner.profileImageUrl,
      } : undefined,
      department: team.department ? {
        departmentId: team.department.departmentId.toString(),
        name: team.department.name,
        code: team.department.code,
      } : null,
      memberCount: team._count?.members || team.members?.length || 0,
      members: team.members?.map((m: any) => ({
        teamMemberId: m.teamMemberId.toString(),
        userId: m.userId.toString(),
        joinedAt: m.joinedAt,
        user: m.user ? {
          userId: m.user.userId.toString(),
          username: m.user.username,
          fullName: m.user.fullName,
          email: m.user.email,
          profileImageUrl: m.user.profileImageUrl,
        } : undefined,
      })),
    };
  }
}
