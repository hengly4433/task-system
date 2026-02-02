import { Injectable, Scope } from '@nestjs/common';
import { Tenant } from '@prisma/client';

/**
 * Request-scoped service to track the current tenant context.
 * This service is instantiated per-request and stores the tenant
 * information for the duration of that request.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private tenantId: bigint | null = null;
  private tenant: Tenant | null = null;

  /**
   * Set the current tenant for this request
   */
  setTenant(tenant: Tenant): void {
    this.tenant = tenant;
    this.tenantId = tenant.tenantId;
  }

  /**
   * Set tenant by ID only (without full tenant object)
   */
  setTenantId(tenantId: bigint): void {
    this.tenantId = tenantId;
  }

  /**
   * Get the current tenant ID
   * @returns The tenant ID or null if not set
   */
  getTenantId(): bigint | null {
    return this.tenantId;
  }

  /**
   * Get the full tenant object
   * @returns The tenant or null if not set
   */
  getTenant(): Tenant | null {
    return this.tenant;
  }

  /**
   * Get the tenant ID, throwing an error if not set.
   * Use this when tenant context is required.
   * @throws Error if tenant is not set
   */
  requireTenantId(): bigint {
    if (!this.tenantId) {
      throw new Error('Tenant context is required but not set');
    }
    return this.tenantId;
  }

  /**
   * Get the full tenant object, throwing an error if not set.
   * @throws Error if tenant is not set
   */
  requireTenant(): Tenant {
    if (!this.tenant) {
      throw new Error('Tenant context is required but not set');
    }
    return this.tenant;
  }

  /**
   * Check if a tenant context is currently set
   */
  hasTenant(): boolean {
    return this.tenantId !== null;
  }

  /**
   * Clear the tenant context
   */
  clear(): void {
    this.tenantId = null;
    this.tenant = null;
  }
}
