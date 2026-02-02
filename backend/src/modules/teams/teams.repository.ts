import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Prisma, Team } from '@prisma/client';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class TeamsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: Prisma.TeamCreateInput): Promise<Team> {
    return this.prisma.team.create({ data });
  }

  async findAll(): Promise<Team[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.team.findMany({
       where: { tenantId },
       include: {
         owner: true
       }
    });
  }

  async findById(id: bigint): Promise<Team | null> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.team.findFirst({
      where: { 
        teamId: id,
        tenantId,
      },
      include: {
        owner: true,
        members: {
            include: { user: true }
        }
      }
    });
  }

  async findByProject(projectId: bigint): Promise<Team[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.team.findMany({
      where: {
        tenantId,
        assignedProjects: { some: { projectId } }
      },
      include: {
        owner: true
      }
    });
  }
}
