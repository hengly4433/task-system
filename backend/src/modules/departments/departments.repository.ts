import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class DepartmentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(data: Prisma.DepartmentCreateInput) {
    return this.prisma.department.create({
      data,
      include: {
        _count: { select: { users: true, workspaces: true } },
      },
    });
  }

  async findById(departmentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.department.findFirst({
      where: { departmentId, tenantId, deletedAt: null },
      include: {
        _count: { select: { users: true, workspaces: true } },
      },
    });
  }

  async findByCode(code: string) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.department.findFirst({
      where: { code, tenantId, deletedAt: null },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.DepartmentWhereInput;
    orderBy?: Prisma.DepartmentOrderByWithRelationInput;
  }) {
    const tenantId = this.tenantContext.requireTenantId();
    const { skip, take, where, orderBy } = params;
    return this.prisma.department.findMany({
      skip,
      take,
      where: { ...where, tenantId, deletedAt: null },
      orderBy: orderBy || { name: 'asc' },
      include: {
        _count: { select: { users: true, workspaces: true } },
      },
    });
  }

  async count(where?: Prisma.DepartmentWhereInput) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.department.count({
      where: { ...where, tenantId, deletedAt: null },
    });
  }

  async update(departmentId: bigint, data: Prisma.DepartmentUpdateInput) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.department.update({
      where: { departmentId, tenantId },
      data,
      include: {
        _count: { select: { users: true, workspaces: true } },
      },
    });
  }

  async softDelete(departmentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.department.update({
      where: { departmentId, tenantId },
      data: { deletedAt: new Date() },
    });
  }

  // User-Department relationships
  async addUserToDepartment(userId: bigint, departmentId: bigint, isPrimary: boolean = false) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify department belongs to tenant
    const dept = await this.findById(departmentId);
    if (!dept) throw new Error('Department not found in this tenant');

    // Verify user belongs to tenant
    const userMembership = await this.prisma.tenantMember.findFirst({
        where: { userId, tenantId },
    });
    if (!userMembership) throw new Error('User is not a member of this tenant');

    // If setting as primary, first unset other primaries for this user
    if (isPrimary) {
      await this.prisma.userDepartment.updateMany({
        where: { 
          userId, 
          isPrimary: true,
          department: {
            tenantId,
          },
        },
        data: { isPrimary: false },
      });
    }

    return this.prisma.userDepartment.upsert({
      where: {
        userId_departmentId: { userId, departmentId },
      },
      create: { userId, departmentId, isPrimary },
      update: { isPrimary },
    });
  }

  async removeUserFromDepartment(userId: bigint, departmentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify department belongs to tenant
    const dept = await this.findById(departmentId);
    if (!dept) throw new Error('Department not found in this tenant');

    return this.prisma.userDepartment.delete({
      where: {
        userId_departmentId: { userId, departmentId },
      },
    });
  }

  async getUserDepartments(userId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.userDepartment.findMany({
      where: { 
        userId,
        department: {
          tenantId,
        },
      },
      include: { department: true },
      orderBy: [{ isPrimary: 'desc' }, { joinedAt: 'asc' }],
    });
  }

  async getDepartmentUsers(departmentId: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    return this.prisma.userDepartment.findMany({
      where: { 
        departmentId,
        department: {
          tenantId,
        },
      },
      include: { user: true },
      orderBy: [{ isPrimary: 'desc' }, { joinedAt: 'asc' }],
    });
  }
}
