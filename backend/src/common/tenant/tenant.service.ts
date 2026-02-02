import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database';

/**
 * Service for tenant-related operations
 */
@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a tenant by ID
   */
  async findById(tenantId: bigint) {
    return this.prisma.tenant.findFirst({
      where: { tenantId, deletedAt: null },
    });
  }

  /**
   * Find a tenant by slug (subdomain)
   */
  async findBySlug(slug: string) {
    return this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  /**
   * Find a tenant by custom domain
   */
  async findByDomain(domain: string) {
    return this.prisma.tenant.findFirst({
      where: { domain, deletedAt: null },
    });
  }

  /**
   * Get the default tenant for a user
   */
  async getDefaultTenantForUser(userId: bigint) {
    const membership = await this.prisma.tenantMember.findFirst({
      where: {
        userId,
        isDefault: true,
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
    });

    return membership?.tenant || null;
  }

  /**
   * Get all tenants a user belongs to
   */
  async getUserTenants(userId: bigint) {
    const memberships = await this.prisma.tenantMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        tenant: true,
      },
    });

    return memberships.map((m) => m.tenant);
  }

  /**
   * Check if a user is a member of a specific tenant
   */
  async isUserMemberOfTenant(userId: bigint, tenantId: bigint): Promise<boolean> {
    const membership = await this.prisma.tenantMember.findFirst({
      where: {
        userId,
        tenantId,
        status: 'ACTIVE',
      },
    });

    return !!membership;
  }

  /**
   * Get user's role in a tenant
   */
  async getUserTenantRole(userId: bigint, tenantId: bigint): Promise<string | null> {
    const membership = await this.prisma.tenantMember.findFirst({
      where: {
        userId,
        tenantId,
        status: 'ACTIVE',
      },
    });

    return membership?.role || null;
  }

  /**
   * Set a tenant as the user's default
   */
  async setDefaultTenant(userId: bigint, tenantId: bigint): Promise<void> {
    // Remove default from all other memberships
    await this.prisma.tenantMember.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set the new default
    await this.prisma.tenantMember.updateMany({
      where: {
        userId,
        tenantId,
      },
      data: {
        isDefault: true,
      },
    });
  }

  /**
   * Resolve tenant from request context
   * Priority: 1. X-Tenant-ID header, 2. subdomain, 3. user's default tenant
   */
  async resolveTenant(options: {
    tenantIdHeader?: string;
    host?: string;
    userId?: bigint;
  }) {
    const { tenantIdHeader, host, userId } = options;

    // 1. Try X-Tenant-ID header
    if (tenantIdHeader) {
      try {
        const tenant = await this.findById(BigInt(tenantIdHeader));
        if (tenant) return tenant;
      } catch {
        // Invalid tenant ID format, continue to next method
      }
    }

    // 2. Try subdomain extraction from host
    if (host) {
      const slug = this.extractSlugFromHost(host);
      if (slug && slug !== 'localhost' && slug !== 'api') {
        const tenant = await this.findBySlug(slug);
        if (tenant) return tenant;
      }
    }

    // 3. Fall back to user's default tenant
    if (userId) {
      const tenant = await this.getDefaultTenantForUser(userId);
      if (tenant) return tenant;
    }

    return null;
  }

  /**
   * Extract slug from host header
   * e.g., "company.example.com" -> "company"
   */
  private extractSlugFromHost(host: string): string | null {
    // Remove port if present
    const hostWithoutPort = host.split(':')[0];
    
    // Split by dots
    const parts = hostWithoutPort.split('.');
    
    // If it's a subdomain format (e.g., company.example.com)
    if (parts.length >= 3) {
      return parts[0];
    }
    
    // If it's just "company" or development (localhost)
    if (parts.length === 1 && parts[0] !== 'localhost') {
      return parts[0];
    }

    return null;
  }
}
