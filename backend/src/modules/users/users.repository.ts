import { Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database';

export interface FindManyUsersParams {
  skip?: number;
  take?: number;
  where?: Prisma.UserWhereInput;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(userId: bigint, tenantId: bigint, includeDeleted = false): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        userId,
        tenantMembers: { some: { tenantId } },
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByUsername(username: string, includeDeleted = false): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        username,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByEmail(email: string, includeDeleted = false): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findMany(params: FindManyUsersParams): Promise<any[]> {
    return this.prisma.user.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: {
        position: true,
        roles: {
          include: {
            role: true,
          },
        },
        departments: {
          include: {
            department: true,
          },
        },
      },
    });
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  async update(userId: bigint, tenantId: bigint, data: Prisma.UserUpdateInput): Promise<User> {
    // Verify membership first
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!member) throw new Error('User not found in this tenant');

    return this.prisma.user.update({
      where: { userId },
      data,
    });
  }

  async softDelete(userId: bigint, tenantId: bigint): Promise<User> {
    // Verify membership first
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!member) throw new Error('User not found in this tenant');

    return this.prisma.user.update({
      where: { userId },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(userId: bigint): Promise<User> {
    return this.prisma.user.delete({
      where: { userId },
    });
  }

  async assignRole(userId: bigint, roleId: bigint): Promise<void> {
    await this.prisma.userRoleMapping.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      create: { userId, roleId },
      update: {},
    });
  }

  async removeAllRoles(userId: bigint): Promise<void> {
    await this.prisma.userRoleMapping.deleteMany({
      where: { userId },
    });
  }

  async findWithRolesAndPosition(userId: bigint): Promise<any> {
    return this.prisma.user.findUnique({
      where: { userId },
      include: {
        position: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}

