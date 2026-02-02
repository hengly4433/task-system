import { Injectable } from '@nestjs/common';
import { Permission, RolePermission, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class PermissionsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // Permission CRUD
  async createPermission(data: Prisma.PermissionCreateInput): Promise<Permission> {
    return this.prisma.permission.create({ data });
  }

  async findPermissionById(permissionId: bigint): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { permissionId } });
  }

  async findPermissionByCode(code: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { code } });
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findPermissionsByCategory(category: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { category },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async updatePermission(permissionId: bigint, data: Prisma.PermissionUpdateInput): Promise<Permission> {
    return this.prisma.permission.update({
      where: { permissionId },
      data,
    });
  }

  async deletePermission(permissionId: bigint): Promise<void> {
    await this.prisma.permission.delete({ where: { permissionId } });
  }

  // Role-Permission mappings
  async findRolePermissions(roleId: bigint): Promise<RolePermission[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.rolePermission.findMany({
      where: { 
        roleId,
        role: {
          tenantId,
        },
      },
      include: { permission: true },
    });
  }

  async findRolePermission(roleId: bigint, permissionId: bigint): Promise<RolePermission | null> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
        role: {
          tenantId,
        },
      },
    });
  }

  async upsertRolePermission(roleId: bigint, permissionId: bigint, granted: boolean): Promise<RolePermission> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify role belongs to tenant
    const role = await this.prisma.role.findFirst({
      where: { roleId, tenantId },
    });
    if (!role) throw new Error('Role not found in this tenant');

    return this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: {
        roleId,
        permissionId,
        granted,
      },
      update: {
        granted,
      },
    });
  }

  async deleteRolePermission(roleId: bigint, permissionId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify role belongs to tenant
    const role = await this.prisma.role.findFirst({
      where: { roleId, tenantId },
    });
    if (!role) throw new Error('Role not found in this tenant');

    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
  }

  async deleteAllRolePermissions(roleId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify role belongs to tenant
    const role = await this.prisma.role.findFirst({
      where: { roleId, tenantId },
    });
    if (!role) throw new Error('Role not found in this tenant');

    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });
  }

  // Bulk operations for efficient permission updates
  async bulkUpsertRolePermissions(
    roleId: bigint,
    permissions: { permissionId: bigint; granted: boolean }[],
  ): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify role belongs to tenant
    const role = await this.prisma.role.findFirst({
      where: { roleId, tenantId },
    });
    if (!role) throw new Error('Role not found in this tenant');

    // Use a transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const perm of permissions) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId: perm.permissionId },
          },
          create: {
            roleId,
            permissionId: perm.permissionId,
            granted: perm.granted,
          },
          update: {
            granted: perm.granted,
          },
        });
      }
    });
  }

  // Get all role-permission mappings for all roles (for matrix view)
  async findAllRolePermissions(): Promise<RolePermission[]> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.rolePermission.findMany({
      where: {
        role: {
          tenantId,
        },
      },
      include: { role: true, permission: true },
    });
  }

  // Get distinct categories
  async getCategories(): Promise<string[]> {
    const result = await this.prisma.permission.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return result.map((r) => r.category);
  }
}
