import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { StorageService } from '../../common/storage/storage.service';
import { CreateTenantDto, UpdateTenantDto, AddTenantMemberDto, UpdateTenantMemberDto } from './dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: bigint) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { tenantId, deletedAt: null },
      include: {
        _count: { select: { members: true, projects: true } },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findUserTenants(userId: bigint) {
    const memberships = await this.prisma.tenantMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        tenant: true,
      },
      orderBy: { isDefault: 'desc' },
    });

    return memberships.map((m) => ({
      tenantId: m.tenant.tenantId.toString(),
      name: m.tenant.name,
      slug: m.tenant.slug,
      domain: m.tenant.domain,
      logoUrl: m.tenant.logoUrl,
      primaryColor: m.tenant.primaryColor,
      status: m.tenant.status,
      plan: m.tenant.plan,
      // Company Info
      description: m.tenant.description,
      industry: m.tenant.industry,
      companySize: m.tenant.companySize,
      foundedYear: m.tenant.foundedYear,
      taxId: m.tenant.taxId,
      phone: m.tenant.phone,
      email: m.tenant.email,
      website: m.tenant.website,
      address: m.tenant.address,
      city: m.tenant.city,
      state: m.tenant.state,
      country: m.tenant.country,
      postalCode: m.tenant.postalCode,
      // Membership info
      role: m.role,
      isDefault: m.isDefault,
    }));
  }

  async create(dto: CreateTenantDto, createdByUserId: bigint) {
    // Check for slug conflict
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('Slug already exists');
    }

    // Check for domain conflict if provided
    if (dto.domain) {
      const existingDomain = await this.prisma.tenant.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new ConflictException('Domain already exists');
      }
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain,
        plan: dto.plan || 'FREE',
      },
    });

    // Add creator as owner
    await this.prisma.tenantMember.create({
      data: {
        tenantId: tenant.tenantId,
        userId: createdByUserId,
        role: 'OWNER',
        status: 'ACTIVE',
        isDefault: false,
        joinedAt: new Date(),
      },
    });

    return this.findById(tenant.tenantId);
  }

  async update(tenantId: bigint, dto: UpdateTenantDto) {
    await this.findById(tenantId);

    // Check for slug conflict if updating
    if (dto.slug) {
      const existingSlug = await this.prisma.tenant.findFirst({
        where: { slug: dto.slug, tenantId: { not: tenantId } },
      });
      if (existingSlug) {
        throw new ConflictException('Slug already exists');
      }
    }

    // Check for domain conflict if updating
    if (dto.domain) {
      const existingDomain = await this.prisma.tenant.findFirst({
        where: { domain: dto.domain, tenantId: { not: tenantId } },
      });
      if (existingDomain) {
        throw new ConflictException('Domain already exists');
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { tenantId },
      data: dto,
    });

    // Convert BigInt to string for JSON serialization
    return {
      ...tenant,
      tenantId: tenant.tenantId.toString(),
      maxStorage: tenant.maxStorage.toString(),
    };
  }

  async delete(tenantId: bigint) {
    await this.findById(tenantId);
    return this.prisma.tenant.update({
      where: { tenantId },
      data: { deletedAt: new Date() },
    });
  }

  async getMembers(tenantId: bigint) {
    await this.findById(tenantId);
    
    return this.prisma.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
            email: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(tenantId: bigint, dto: AddTenantMemberDto) {
    await this.findById(tenantId);
    const userId = BigInt(dto.userId);

    // Check if already a member
    const existing = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this tenant');
    }

    return this.prisma.tenantMember.create({
      data: {
        tenantId,
        userId,
        role: dto.role || 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
            email: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
    });
  }

  async updateMemberRole(tenantId: bigint, userId: bigint, dto: UpdateTenantMemberDto) {
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.tenantMember.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: { role: dto.role },
    });
  }

  async removeMember(tenantId: bigint, userId: bigint) {
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Prevent removing the last owner
    if (member.role === 'OWNER') {
      const ownerCount = await this.prisma.tenantMember.count({
        where: { tenantId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner');
      }
    }

    return this.prisma.tenantMember.delete({
      where: { tenantId_userId: { tenantId, userId } },
    });
  }

  async setDefaultTenant(userId: bigint, tenantId: bigint) {
    // Verify membership
    const member = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this tenant');
    }

    // Clear previous default
    await this.prisma.tenantMember.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.tenantMember.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: { isDefault: true },
    });
  }

  async uploadLogo(tenantId: bigint, file: Express.Multer.File): Promise<{ logoUrl: string }> {
    console.log('uploadLogo called with tenantId:', tenantId.toString());
    console.log('File received:', file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : 'NO FILE');
    
    await this.findById(tenantId);

    if (!file || !file.buffer) {
      throw new Error('No file received or file buffer is empty');
    }

    // Upload to storage
    console.log('Uploading to storage...');
    const result = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      'tenant-logos',
    );
    console.log('Storage upload result:', result);

    // Update tenant with logo URL
    await this.prisma.tenant.update({
      where: { tenantId },
      data: { logoUrl: result.publicUrl },
    });
    console.log('Tenant updated with logo URL:', result.publicUrl);

    return { logoUrl: result.publicUrl };
  }
}
