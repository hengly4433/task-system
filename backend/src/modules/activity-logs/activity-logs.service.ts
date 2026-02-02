import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { ListActivityLogsQueryDto, ActivityLogResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class ActivityLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findByUser(userId: bigint, query: ListActivityLogsQueryDto): Promise<ActivityLogResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify user belongs to tenant
    const userMember = await this.prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });
    if (!userMember) throw new Error('User not found in this tenant');

    const logs = await this.prisma.activityLog.findMany({
      where: {
        userId,
        ...(query.activityType && { activityType: query.activityType }),
      },
      orderBy: { createdAt: query.order || 'desc' },
      take: 100,
    });
    return logs.map((l) => this.mapToResponse(l));
  }

  async findAll(query: ListActivityLogsQueryDto): Promise<ActivityLogResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    
    const logs = await this.prisma.activityLog.findMany({
      where: {
        ...(query.activityType && { activityType: query.activityType }),
        user: {
          tenantMembers: {
            some: {
              tenantId,
            },
          },
        },
      },
      orderBy: { createdAt: query.order || 'desc' },
      take: 100,
    });
    return logs.map((l) => this.mapToResponse(l));
  }

  private mapToResponse(l: { logId: bigint; userId: bigint; activityType: string; details: string | null; createdAt: Date }): ActivityLogResponseDto {
    return {
      logId: l.logId.toString(),
      userId: l.userId.toString(),
      activityType: l.activityType,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    };
  }
}
