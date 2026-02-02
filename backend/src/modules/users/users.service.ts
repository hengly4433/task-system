import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto, UserResponseDto } from './dto';
import { UsersMapper } from './users.mapper';
import { AuditService } from '../../common/audit';
import { MailService } from '../../common/mail';
import { PrismaService } from '../../common/database';
import { StorageService } from '../../common/storage';
import { PaginatedResult, createPaginatedResult, getPaginationParams, getSortParams } from '../../common/pagination';
import { TenantContextService } from '../../common/tenant';
import { SubscriptionService } from '../../common/subscription';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly tenantContext: TenantContextService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  async create(dto: CreateUserDto, createdByUserId?: bigint): Promise<UserResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Check if user already exists globally by email
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      // User exists globally - check if already in this tenant
      const existingMembership = await this.prisma.tenantMember.findUnique({
        where: { tenantId_userId: { tenantId, userId: existingUser.userId } },
      });

      if (existingMembership) {
        throw new ConflictException('User is already a member of this organization');
      }

      // Add existing user to this tenant (shared user model)
      await this.prisma.tenantMember.create({
        data: {
          tenantId,
          userId: existingUser.userId,
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      // Assign roles if provided
      if (dto.roleIds && dto.roleIds.length > 0) {
        await this.assignRolesToUser(existingUser.userId, dto.roleIds);
      }

      // Assign to department if provided
      if (dto.departmentId) {
        const existingDept = await this.prisma.userDepartment.findUnique({
          where: {
            userId_departmentId: {
              userId: existingUser.userId,
              departmentId: BigInt(dto.departmentId),
            },
          },
        });
        if (!existingDept) {
          await this.prisma.userDepartment.create({
            data: {
              userId: existingUser.userId,
              departmentId: BigInt(dto.departmentId),
              role: 'MEMBER',
              isPrimary: false, // Not primary since user may have primary in another tenant
            },
          });
        }
      }

      // Log activity
      if (createdByUserId) {
        await this.auditService.logActivity({
          userId: createdByUserId,
          activityType: 'USER_INVITED',
          details: `Added existing user ${existingUser.email} to organization`,
        });
      }

      // Fetch updated user with all relations
      const updatedUser = await this.usersRepository.findById(existingUser.userId, tenantId);
      return UsersMapper.toResponse(updatedUser || existingUser);
    }

    // New user flow - check subscription limit
    await this.subscriptionService.checkUserLimit();

    // Check for existing username (only for new users)
    const existingUsername = await this.usersRepository.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Hash password if provided, otherwise leave null for invite flow
    const passwordHash = dto.password ? await this.hashPassword(dto.password) : null;

    const user = await this.usersRepository.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      ...(dto.positionId && {
        position: { connect: { positionId: BigInt(dto.positionId) } },
      }),
    });

    // Assign roles if provided
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.assignRolesToUser(user.userId, dto.roleIds);
    }

    // Assign to primary department if provided
    if (dto.departmentId) {
      await this.prisma.userDepartment.create({
        data: {
          userId: user.userId,
          departmentId: BigInt(dto.departmentId),
          role: 'MEMBER',
          isPrimary: true,
        },
      });
    }

    // Add new user to the current tenant
    await this.prisma.tenantMember.create({
      data: {
        tenantId,
        userId: user.userId,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
        isDefault: true,
      },
    });

    // If no password provided, create setup token and send invite email
    if (!dto.password) {
      const token = this.generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      await this.prisma.passwordSetupToken.create({
        data: {
          userId: user.userId,
          token,
          expiresAt,
        },
      });

      // Send invite email
      await this.mailService.sendPasswordSetupEmail(
        user.email,
        user.fullName,
        token,
      );
    }

    // Log activity if we have a user context
    if (createdByUserId) {
      await this.auditService.logActivity({
        userId: createdByUserId,
        activityType: 'USER_CREATED',
        details: `Created user: ${user.username}`,
      });
    }

    return UsersMapper.toResponse(user);
  }

  private async assignRolesToUser(userId: bigint, roleIds: string[]): Promise<void> {
    // Remove existing role assignments
    await this.usersRepository.removeAllRoles(userId);
    
    // Create new role assignments
    for (const roleId of roleIds) {
      await this.usersRepository.assignRole(userId, BigInt(roleId));
    }
  }

  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(
      BigInt(userId),
      this.tenantContext.requireTenantId(),
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return UsersMapper.toResponse(user);
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResult<UserResponseDto>> {
    const { skip, take } = getPaginationParams(query);
    const { orderBy } = getSortParams(query, ['username', 'email', 'createdAt']);

    const where = {
      tenantMembers: { some: { tenantId: this.tenantContext.requireTenantId() } },
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [users, totalItems] = await Promise.all([
      this.usersRepository.findMany({ skip, take, where, orderBy }),
      this.usersRepository.count(where),
    ]);

    return createPaginatedResult(UsersMapper.toResponseList(users), totalItems, query);
  }

  async update(userId: string, dto: UpdateUserDto, updatedByUserId?: bigint): Promise<UserResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const user = await this.usersRepository.findById(BigInt(userId), tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for conflicts if updating username or email
    if (dto.username && dto.username !== user.username) {
      const existingUsername = await this.usersRepository.findByUsername(dto.username);
      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.usersRepository.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    const updatedUser = await this.usersRepository.update(BigInt(userId), tenantId, {
      ...(dto.username && { username: dto.username }),
      ...(dto.email && { email: dto.email }),
      ...(dto.password && { passwordHash: await this.hashPassword(dto.password) }),
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.positionId !== undefined && {
        positionId: dto.positionId ? BigInt(dto.positionId) : null,
      }),
      ...(dto.profileImageUrl !== undefined && { profileImageUrl: dto.profileImageUrl }),
    });

    // Update roles if provided
    if (dto.roleIds !== undefined) {
      await this.assignRolesToUser(BigInt(userId), dto.roleIds);
    }

    // Update primary department if provided
    if (dto.departmentId !== undefined) {
      // Remove existing primary department assignments
      await this.prisma.userDepartment.deleteMany({
        where: { userId: BigInt(userId), isPrimary: true },
      });
      
      // Add new primary department if a departmentId is provided
      if (dto.departmentId) {
        await this.prisma.userDepartment.upsert({
          where: {
            userId_departmentId: {
              userId: BigInt(userId),
              departmentId: BigInt(dto.departmentId),
            },
          },
          create: {
            userId: BigInt(userId),
            departmentId: BigInt(dto.departmentId),
            isPrimary: true,
          },
          update: {
            isPrimary: true,
          },
        });
      }
    }

    // Log activity if we have a user context
    if (updatedByUserId) {
      await this.auditService.logActivity({
        userId: updatedByUserId,
        activityType: 'USER_UPDATED',
        details: `Updated user: ${updatedUser.username}`,
      });
    }

    return UsersMapper.toResponse(updatedUser);
  }

  async softDelete(userId: string, deletedByUserId?: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const user = await this.usersRepository.findById(BigInt(userId), tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.softDelete(BigInt(userId), tenantId);

    // Log activity if we have a user context
    if (deletedByUserId) {
      await this.auditService.logActivity({
        userId: deletedByUserId,
        activityType: 'USER_DELETED',
        details: `Deleted user: ${user.username}`,
      });
    }
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ profileImageUrl: string }> {
    const tenantId = this.tenantContext.requireTenantId();
    const user = await this.usersRepository.findById(BigInt(userId), tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upload to Supabase storage
    const uploadResult = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      `avatars/${userId}`,
    );

    // Update user's profile image URL
    await this.usersRepository.update(BigInt(userId), tenantId, {
      profileImageUrl: uploadResult.publicUrl,
    });

    await this.auditService.logActivity({
      userId: BigInt(userId),
      activityType: 'AVATAR_UPDATED',
      details: `Updated profile image`,
    });

    return { profileImageUrl: uploadResult.publicUrl };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { userId: BigInt(userId), deletedAt: null },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const bcrypt = await import('bcrypt');
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new ConflictException('Current password is incorrect');
    }

    // Hash and update new password
    const newPasswordHash = await this.hashPassword(newPassword);
    await this.usersRepository.update(BigInt(userId), this.tenantContext.requireTenantId(), {
      passwordHash: newPasswordHash,
    });

    await this.auditService.logActivity({
      userId: BigInt(userId),
      activityType: 'PASSWORD_CHANGED',
      details: 'Password changed successfully',
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async updatePresence(userId: bigint, status: string): Promise<void> {
    await this.usersRepository.update(userId, this.tenantContext.requireTenantId(), {
      presenceStatus: status,
      lastSeenAt: new Date(),
    });
  }

  async resetAllPresence(): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Only reset presence for users in the current tenant
    await this.prisma.user.updateMany({
      data: {
        presenceStatus: 'inactive',
      },
      where: {
        presenceStatus: {
          not: 'inactive',
        },
        tenantMembers: {
          some: {
            tenantId,
            status: 'ACTIVE',
          },
        },
      },
    });
  }
}
