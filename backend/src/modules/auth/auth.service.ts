import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database';
import { LoginDto, RegisterDto, AuthResponseDto, ForgotPasswordResponseDto, ResetPasswordResponseDto, SetupPasswordResponseDto, ValidateTokenResponseDto } from './dto';
import { MailService } from '../../common/mail';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }],
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has set up their password (Google users may not have one)
    if (!user.passwordHash) {
      throw new UnauthorizedException('Please set a password or login with Google');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user roles
    const userRoles = await this.prisma.userRoleMapping.findMany({
      where: { userId: user.userId },
      include: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.roleName);

    const payload = { sub: user.userId.toString(), username: user.username, email: user.email };
    
    // Use extended expiry if rememberMe is true
    const expiresIn = dto.rememberMe ? '30d' : '1d';
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      accessToken,
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      roles,
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUsername = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash: hashedPassword,
        fullName: dto.fullName,
      },
    });

    // Create a new tenant for the user
    const organizationName = dto.organizationName || `${dto.fullName || dto.username}'s Organization`;
    const slug = await this.generateUniqueSlug(organizationName);
    
    const tenant = await this.prisma.tenant.create({
      data: {
        name: organizationName,
        slug: slug,
        status: 'ACTIVE',
        plan: 'FREE',
      },
    });

    // Assign user as OWNER of the new tenant
    await this.prisma.tenantMember.create({
      data: {
        tenantId: tenant.tenantId,
        userId: user.userId,
        role: 'OWNER',
        status: 'ACTIVE',
        isDefault: true,
        joinedAt: new Date(),
      },
    });

    // Create Admin role for tenant and assign to owner
    const adminRole = await this.getOrCreateAdminRole(tenant.tenantId);
    await this.prisma.userRoleMapping.create({
      data: {
        userId: user.userId,
        roleId: adminRole.roleId,
      },
    });

    // Also create User role for the tenant (for assigning to staff)
    await this.getOrCreateUserRole(tenant.tenantId);

    const roles = ['Admin'];

    const payload = { sub: user.userId.toString(), username: user.username, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      roles,
    };
  }

  // ============================================
  // COMMENTED OUT - Email setup password flow disabled
  // Password is now entered during registration
  // ============================================
  async validateSetupToken(token: string): Promise<ValidateTokenResponseDto> {
    const tokenRecord = await this.prisma.passwordSetupToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord) {
      return { valid: false, message: 'Invalid token' };
    }

    if (tokenRecord.usedAt) {
      return { valid: false, message: 'Token has already been used' };
    }

    if (tokenRecord.expiresAt < new Date()) {
      return { valid: false, message: 'Token has expired' };
    }

    return {
      valid: true,
      email: tokenRecord.user.email,
      fullName: tokenRecord.user.fullName || undefined,
    };
  }

  async setupPassword(token: string, password: string): Promise<SetupPasswordResponseDto> {
    const tokenRecord = await this.prisma.passwordSetupToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid token');
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException('Token has already been used');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { userId: tokenRecord.userId },
        data: { passwordHash: hashedPassword },
      }),
      this.prisma.passwordSetupToken.update({
        where: { tokenId: tokenRecord.tokenId },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: 'Password set successfully. You can now log in.',
    };
  }

  // ============================================
  // Forgot Password Flow
  // ============================================
  async forgotPassword(email: string): Promise<ForgotPasswordResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    // Always return success message to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store the reset token (reuse PasswordSetupToken table)
    await this.prisma.passwordSetupToken.create({
      data: {
        userId: user.userId,
        token,
        expiresAt,
      },
    });

    // Send reset email
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.fullName,
      token,
    );

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, password: string): Promise<ResetPasswordResponseDto> {
    const tokenRecord = await this.prisma.passwordSetupToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException('This reset link has already been used');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('This reset link has expired');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { userId: tokenRecord.userId },
        data: { passwordHash: hashedPassword },
      }),
      this.prisma.passwordSetupToken.update({
        where: { tokenId: tokenRecord.tokenId },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }

  async validateUser(userId: bigint) {
    return this.prisma.user.findFirst({
      where: { userId, deletedAt: null },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { userId: BigInt(userId), deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Fetch position name if positionId exists
    let positionName: string | null = null;
    if ((user as any).positionId) {
      const position = await this.prisma.position.findUnique({
        where: { positionId: (user as any).positionId },
      });
      positionName = position?.positionName || null;
    }

    // Fetch user roles
    const userRoles = await this.prisma.userRoleMapping.findMany({
      where: { userId: user.userId },
      include: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.roleName);

    // Fetch primary department
    const primaryDepartment = await this.prisma.userDepartment.findFirst({
      where: { userId: user.userId, isPrimary: true },
      include: { department: true },
    });

    return {
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName || null,
      position: positionName,
      profileImageUrl: (user as any).profileImageUrl || null,
      roles,
      primaryDepartmentId: primaryDepartment?.departmentId?.toString() || null,
      primaryDepartmentName: primaryDepartment?.department?.name || null,
      hasPassword: !!user.passwordHash,
    };
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new BadRequestException('No user from google');
    }

    const { email, firstName, lastName, picture } = req.user;

    // Check if user exists
    let user = await this.prisma.user.findFirst({
      where: { email: email, deletedAt: null },
    });

    let isNewUser = false;
    let setupToken: string | null = null;

    if (!user) {
      isNewUser = true;
      // Create new user
      // Generate a unique username
      let username = email.split('@')[0];
      const existingUsername = await this.prisma.user.findFirst({
        where: { username: username },
      });
      if (existingUsername) {
        username = `${username}${Math.floor(Math.random() * 1000)}`;
      }

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          fullName: `${firstName} ${lastName}`,
          profileImageUrl: picture,
          // No password hash for Google users initially
        },
      });

      // Create a default tenant for the new Google user
      await this.createTenantForUser(user.userId, firstName);
    } else {
      // Existing user - check if they own any tenant
      const ownedTenant = await this.prisma.tenantMember.findFirst({
        where: {
          userId: user.userId,
          role: 'OWNER',
        },
      });

      if (!ownedTenant) {
        // User exists but doesn't own any tenant - create one for them
        const userFirstName = user.fullName?.split(' ')[0] || user.username;
        await this.createTenantForUser(user.userId, userFirstName);
      }
    }

    // Check if user has a password set
    if (!user.passwordHash) {
      // Generate a secure token for password setup
      setupToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.prisma.passwordSetupToken.create({
        data: {
          userId: user.userId,
          token: setupToken,
          expiresAt,
        },
      });
    }

    // Fetch user's roles to return in response
    const userRoles = await this.prisma.userRoleMapping.findMany({
      where: { userId: user.userId },
      include: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.roleName);

    // Generate JWT
    const payload = { sub: user.userId.toString(), username: user.username, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName || null,
      profileImageUrl: (user as any).profileImageUrl || null,
      roles,
      isNewUser,
      setupToken,
    };
  }

  /**
   * Create a new tenant for a user and set them as OWNER with Admin role.
   * Also creates the User role for the tenant.
   */
  private async createTenantForUser(userId: bigint, firstName: string) {
    const organizationName = `${firstName}'s Workspace`;
    const slug = await this.generateUniqueSlug(organizationName);
    
    const tenant = await this.prisma.tenant.create({
      data: {
        name: organizationName,
        slug: slug,
        status: 'ACTIVE',
        plan: 'FREE',
      },
    });

    // Assign user as OWNER of the new tenant
    await this.prisma.tenantMember.create({
      data: {
        tenantId: tenant.tenantId,
        userId: userId,
        role: 'OWNER',
        status: 'ACTIVE',
        isDefault: true,
        joinedAt: new Date(),
      },
    });

    // Create Admin role for tenant and assign to owner
    const adminRole = await this.getOrCreateAdminRole(tenant.tenantId);
    await this.prisma.userRoleMapping.create({
      data: {
        userId: userId,
        roleId: adminRole.roleId,
      },
    });

    // Also create User role for the tenant (for assigning to staff)
    await this.getOrCreateUserRole(tenant.tenantId);

    return tenant;
  }

  /**
   * Get or create an Admin role for a tenant with all permissions granted.
   * This is used when creating a new tenant to give the owner full access.
   */
  private async getOrCreateAdminRole(tenantId: bigint) {
    // Check if Admin role already exists for this tenant
    let adminRole = await this.prisma.role.findFirst({
      where: {
        tenantId,
        roleName: 'Admin',
      },
    });

    if (!adminRole) {
      // Create Admin role for the tenant
      adminRole = await this.prisma.role.create({
        data: {
          tenantId,
          roleName: 'Admin',
          description: 'Full access to all features',
          color: '#f1184c',
          isSystem: true,
        },
      });

      // Get all permissions and grant them to Admin role
      const allPermissions = await this.prisma.permission.findMany();
      
      if (allPermissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: allPermissions.map((p) => ({
            roleId: adminRole!.roleId,
            permissionId: p.permissionId,
            granted: true,
          })),
        });
      }
    }

    return adminRole;
  }

  /**
   * Get or create a User role for a tenant with basic permissions.
   * This is a system role available for assigning to staff members.
   */
  private async getOrCreateUserRole(tenantId: bigint) {
    // Check if User role already exists for this tenant
    let userRole = await this.prisma.role.findFirst({
      where: {
        tenantId,
        roleName: 'User',
      },
    });

    if (!userRole) {
      // Create User role for the tenant
      userRole = await this.prisma.role.create({
        data: {
          tenantId,
          roleName: 'User',
          description: 'Basic access for team members',
          color: '#6366f1',
          isSystem: true,
        },
      });

      // Grant basic permissions to User role (read-only access)
      // Find permissions that are suitable for regular users
      const basicPermissions = await this.prisma.permission.findMany({
        where: {
          OR: [
            { code: { contains: 'view' } },
            { code: { contains: 'read' } },
            { code: { in: ['task.add', 'task.edit_own', 'comment.add'] } },
          ],
        },
      });
      
      if (basicPermissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: basicPermissions.map((p) => ({
            roleId: userRole!.roleId,
            permissionId: p.permissionId,
            granted: true,
          })),
        });
      }
    }

    return userRole;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      slug = 'org';
    }

    // Check if slug exists
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existing) {
      // Append random string
      const suffix = Math.random().toString(36).substring(2, 7);
      slug = `${slug}-${suffix}`;
    }

    return slug;
  }
}
