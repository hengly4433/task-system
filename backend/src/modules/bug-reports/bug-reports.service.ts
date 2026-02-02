import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { AuditService } from '../../common/audit';
import { CreateBugReportDto, UpdateBugReportDto, BugReportResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class BugReportsService {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(projectId: string, dto: CreateBugReportDto, userId: bigint): Promise<BugReportResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { projectId: BigInt(projectId), tenantId },
    });
    if (!project) throw new NotFoundException('Project not found in this tenant');

    const bug = await this.prisma.bugReport.create({
      data: {
        projectId: BigInt(projectId),
        reportedBy: userId,
        bugDescription: dto.bugDescription,
        priority: dto.priority || 'MEDIUM',
      },
    });
    await this.auditService.logActivity({ userId, activityType: 'BUG_REPORT_CREATED', details: `Reported bug in project ${projectId}` });
    return this.mapToResponse(bug);
  }

  async findByProject(projectId: string): Promise<BugReportResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const bugs = await this.prisma.bugReport.findMany({
      where: { 
        projectId: BigInt(projectId),
        project: {
          tenantId,
        },
      },
      orderBy: { reportedAt: 'desc' },
    });
    return bugs.map((b) => this.mapToResponse(b));
  }

  async update(bugId: string, dto: UpdateBugReportDto, userId: bigint): Promise<BugReportResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const bug = await this.prisma.bugReport.findFirst({ 
      where: { 
        bugId: BigInt(bugId),
        project: {
          tenantId,
        },
      } 
    });
    if (!bug) throw new NotFoundException('Bug report not found in this tenant');

    const updated = await this.prisma.bugReport.update({
      where: { bugId: BigInt(bugId) },
      data: { status: dto.status, priority: dto.priority },
    });
    await this.auditService.logActivity({ userId, activityType: 'BUG_REPORT_UPDATED', details: `Updated bug ${bugId}` });
    return this.mapToResponse(updated);
  }

  private mapToResponse(b: { bugId: bigint; projectId: bigint; reportedBy: bigint; bugDescription: string; priority: string; status: string; reportedAt: Date }): BugReportResponseDto {
    return {
      bugId: b.bugId.toString(),
      projectId: b.projectId.toString(),
      reportedBy: b.reportedBy.toString(),
      bugDescription: b.bugDescription,
      priority: b.priority,
      status: b.status,
      reportedAt: b.reportedAt.toISOString(),
    };
  }
}
