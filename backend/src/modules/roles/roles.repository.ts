import { Injectable } from '@nestjs/common';
import { Role, UserRoleMapping, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class RolesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createRole(data: Prisma.RoleUncheckedCreateInput): Promise<Role> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.role.create({ 
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findRoleById(roleId: bigint): Promise<Role | null> {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.role.findFirst({ 
      where: { 
        roleId,
        OR: [
          { tenantId: null },
          ...(tenantId ? [{ tenantId }] : []),
        ],
      },
    });
  }

  async findRoleByName(roleName: string): Promise<Role | null> {
    // Use findFirst with tenant filter - includes system roles (null tenantId) and tenant-specific roles
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.role.findFirst({ 
      where: { 
        roleName,
        OR: [
          { tenantId: null }, // System roles
          ...(tenantId ? [{ tenantId }] : []), // Tenant-specific roles
        ],
      },
    });
  }

  async findAllRoles(excludeRoles?: string[]): Promise<Role[]> {
    const tenantId = this.tenantContext.getTenantId();
    return this.prisma.role.findMany({ 
      where: {
        OR: [
          { 
            tenantId: null,
            ...(excludeRoles?.length ? { roleName: { notIn: excludeRoles } } : {}),
          }, // System roles (filtered)
          ...(tenantId ? [{ tenantId }] : []), // Tenant-specific custom roles
        ],
      },
      orderBy: { roleName: 'asc' },
    });
  }

  async assignRole(userId: bigint, roleId: bigint): Promise<UserRoleMapping> {
    return this.prisma.userRoleMapping.create({
      data: { userId, roleId },
    });
  }

  async unassignRole(userId: bigint, roleId: bigint): Promise<void> {
    await this.prisma.userRoleMapping.deleteMany({
      where: { userId, roleId },
    });
  }

  async findUserRoles(userId: bigint): Promise<UserRoleMapping[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.userRoleMapping.findMany({
      where: { 
        userId,
        user: {
          tenantMembers: {
            some: {
              tenantId,
            },
          },
        },
      },
      include: { role: true },
    });
  }

  async findRoleMapping(userId: bigint, roleId: bigint): Promise<UserRoleMapping | null> {
    return this.prisma.userRoleMapping.findFirst({
      where: { userId, roleId },
    });
  }

  async verifyUserInTenant(userId: bigint, tenantId: bigint): Promise<boolean> {
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    return !!membership;
  }
}
