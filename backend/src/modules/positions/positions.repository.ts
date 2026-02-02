import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class PositionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll() {
    return this.prisma.position.findMany({
      where: { tenantId: this.tenantContext.requireTenantId() },
      orderBy: { positionName: 'asc' },
    });
  }

  async findById(positionId: bigint, tenantId?: bigint) {
    const activeTenantId = tenantId || this.tenantContext.requireTenantId();
    return this.prisma.position.findFirst({
      where: { 
        positionId,
        tenantId: activeTenantId,
      },
    });
  }

  async findByName(positionName: string) {
    // Use findFirst with tenant filter instead of findUnique
    return this.prisma.position.findFirst({
      where: { 
        positionName,
        tenantId: this.tenantContext.requireTenantId(),
      },
    });
  }

  async create(data: { positionName: string; description?: string }) {
    return this.prisma.position.create({ 
      data: {
        ...data,
        tenantId: this.tenantContext.requireTenantId(),
      },
    });
  }

  async update(positionId: bigint, data: { positionName?: string; description?: string }, tenantId?: bigint) {
    const activeTenantId = tenantId || this.tenantContext.requireTenantId();
    // Verify ownership
    const position = await this.findById(positionId, activeTenantId);
    if (!position) throw new Error('Position not found in this tenant');

    return this.prisma.position.update({
      where: { positionId },
      data,
    });
  }

  async delete(positionId: bigint, tenantId?: bigint) {
    const activeTenantId = tenantId || this.tenantContext.requireTenantId();
    // Verify ownership
    const position = await this.findById(positionId, activeTenantId);
    if (!position) throw new Error('Position not found in this tenant');

    return this.prisma.position.delete({
      where: { positionId },
    });
  }

  async countUsers(positionId: bigint, tenantId?: bigint) {
    const activeTenantId = tenantId || this.tenantContext.requireTenantId();
    return this.prisma.user.count({
      where: { 
        positionId,
        tenantMembers: {
          some: {
            tenantId: activeTenantId,
          },
        },
      },
    });
  }
}
