import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { CreateAnnouncementDto, AnnouncementResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(projectId: string, dto: CreateAnnouncementDto, userId: bigint): Promise<AnnouncementResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { projectId: BigInt(projectId), tenantId },
    });
    if (!project) throw new Error('Project not found in this tenant');

    const announcement = await this.prisma.announcement.create({
      data: { projectId: BigInt(projectId), announcementText: dto.announcementText, createdBy: userId },
    });
    return this.mapToResponse(announcement);
  }

  async findByProject(projectId: string): Promise<AnnouncementResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    
    const announcements = await this.prisma.announcement.findMany({
      where: { 
        projectId: BigInt(projectId),
        project: {
          tenantId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return announcements.map((a) => this.mapToResponse(a));
  }

  private mapToResponse(a: { announcementId: bigint; projectId: bigint; announcementText: string; createdBy: bigint | null; createdAt: Date }): AnnouncementResponseDto {
    return {
      announcementId: a.announcementId.toString(),
      projectId: a.projectId.toString(),
      announcementText: a.announcementText,
      createdBy: a.createdBy?.toString() || null,
      createdAt: a.createdAt.toISOString(),
    };
  }
}
