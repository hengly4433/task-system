import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { UpsertPreferenceDto, PreferenceResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class PreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async upsert(userId: bigint, dto: UpsertPreferenceDto): Promise<PreferenceResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify user belongs to tenant
    const userMembership = await this.prisma.tenantMember.findFirst({
      where: { userId, tenantId },
    });
    if (!userMembership) throw new ForbiddenException('User is not a member of this tenant');

    const existing = await this.prisma.userPreference.findFirst({
      where: { userId, preferenceName: dto.preferenceName },
    });

    if (existing) {
      const updated = await this.prisma.userPreference.update({
        where: { preferenceId: existing.preferenceId },
        data: { preferenceValue: dto.preferenceValue },
      });
      return this.mapToResponse(updated);
    }

    const created = await this.prisma.userPreference.create({
      data: { userId, preferenceName: dto.preferenceName, preferenceValue: dto.preferenceValue },
    });
    return this.mapToResponse(created);
  }

  async findByUser(userId: bigint): Promise<PreferenceResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify user belongs to tenant
    const userMembership = await this.prisma.tenantMember.findFirst({
      where: { userId, tenantId },
    });
    if (!userMembership) throw new ForbiddenException('User is not a member of this tenant');

    const prefs = await this.prisma.userPreference.findMany({
      where: { userId },
      orderBy: { preferenceName: 'asc' },
    });
    return prefs.map((p) => this.mapToResponse(p));
  }

  private mapToResponse(p: { preferenceId: bigint; preferenceName: string; preferenceValue: string }): PreferenceResponseDto {
    return {
      preferenceId: p.preferenceId.toString(),
      preferenceName: p.preferenceName,
      preferenceValue: p.preferenceValue,
    };
  }
}
