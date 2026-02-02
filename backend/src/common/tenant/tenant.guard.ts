import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
  Scope,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { TenantService } from './tenant.service';

export const SKIP_TENANT_GUARD_KEY = 'skipTenantGuard';

/**
 * Guard that validates and sets the tenant context for each request.
 * 
 * This guard:
 * 1. Extracts tenant information from request (header, subdomain, or user default)
 * 2. Validates that the user has access to the requested tenant
 * 3. Sets the tenant context for downstream services
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantGuard implements CanActivate {
  constructor(
    @Optional() @Inject(Reflector) private readonly reflector: Reflector | null,
    private readonly tenantContextService: TenantContextService,
    private readonly tenantService: TenantService,
  ) {}

  canActivate = async (context: ExecutionContext): Promise<boolean> => {
    const request = context.switchToHttp().getRequest();
    console.log(`[TenantGuard] Processing request: ${request.method} ${request.url}`);

    // Check if this route should skip tenant validation
    // Handle case where reflector might not be injected
    if (this.reflector) {
      const skipTenantGuard = this.reflector.getAllAndOverride<boolean>(
        SKIP_TENANT_GUARD_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (skipTenantGuard) {
        return true;
      }
    }

    const user = request.user;

    // If no user is authenticated, skip tenant check (auth guard will handle it)
    if (!user) {
      return true;
    }

    const userId = BigInt(user.sub);
    const tenantIdHeader = request.headers['x-tenant-id'];
    const host = request.headers['host'];

    // Resolve tenant from various sources
    const tenant = await this.tenantService.resolveTenant({
      tenantIdHeader,
      host,
      userId,
    });

    console.log(`[TenantGuard] User ${userId}, Header: ${tenantIdHeader}, Resolved Tenant: ${tenant?.tenantId || 'NONE'}`);

    // If no tenant found
    if (!tenant) {
      // Super admins might not have a default tenant if they aren't members anywhere
      // but usually they are. If no tenant and not super admin, we must fail.
      const userRoles = user.roles || [];
      if (!(userRoles.includes('SUPER_ADMIN') || userRoles.includes('Super Admin'))) {
        console.log(`[TenantGuard] No tenant found for user ${userId} - throwing ForbiddenException`);
        throw new ForbiddenException('No tenant context available. Please select a tenant.');
      }
      
      // For super admins with no tenant, we allow it (service must handle null tenant if they use getTenantId)
      // but since most services use requireTenantId, this might still cause issues.
      // However, we at least don't block the request here.
      return true;
    }

    // Verify user has access to this tenant (Super admins bypass this)
    const userRoles = user.roles || [];
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('Super Admin');
    
    if (!isSuperAdmin) {
      const isMember = await this.tenantService.isUserMemberOfTenant(userId, tenant.tenantId);
      if (!isMember) {
        throw new ForbiddenException('You do not have access to this tenant.');
      }
    }

    // Check tenant status (Super admins also bypass suspension check? Usually yes, to fix things)
    if (tenant.status === 'SUSPENDED' && !isSuperAdmin) {
      throw new ForbiddenException('This organization has been suspended. Please contact support.');
    }

    // Set tenant context for the request
    this.tenantContextService.setTenant(tenant);
    console.log(`[TenantGuard] Set tenant context: ${tenant.tenantId} - ${tenant.name}`);

    // Attach tenant to request for easy access in controllers
    request.tenant = tenant;
    request.tenantId = tenant.tenantId;

    return true;
  }
}
