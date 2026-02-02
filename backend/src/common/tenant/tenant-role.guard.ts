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
import { TENANT_ROLES_KEY, TenantRole } from './decorators/require-tenant-role.decorator';

/**
 * Guard that enforces tenant role requirements.
 * 
 * This guard should be applied after TenantGuard to ensure tenant context is available.
 * It checks if the current user has one of the required roles in the current tenant.
 * 
 * Role hierarchy:
 * - OWNER has implicit ADMIN and MEMBER access
 * - ADMIN has implicit MEMBER access
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantRoleGuard implements CanActivate {
  constructor(
    @Optional() @Inject(Reflector) private readonly reflector: Reflector | null,
    private readonly tenantContextService: TenantContextService,
    private readonly tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // If no reflector available, skip role check
    if (!this.reflector) {
      return true;
    }

    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<TenantRole[]>(
      TENANT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, deny access
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admins bypass tenant role restrictions
    const userRoles = user.roles || [];
    if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('Super Admin')) {
      return true;
    }

    // Get tenant context
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // Get user's role in this tenant
    const userId = BigInt(user.sub);
    const userTenantRole = await this.tenantService.getUserTenantRole(userId, tenantId);

    if (!userTenantRole) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check if user has any of the required roles
    // Apply role hierarchy: OWNER > ADMIN > MEMBER
    const hasAccess = this.checkRoleAccess(userTenantRole, requiredRoles);

    if (!hasAccess) {
      throw new ForbiddenException(
        `This action requires ${requiredRoles.join(' or ')} role in this organization`,
      );
    }

    return true;
  }

  /**
   * Check if the user's role grants access based on role hierarchy.
   * OWNER has all access, ADMIN has ADMIN and MEMBER access, MEMBER only has MEMBER access.
   */
  private checkRoleAccess(userRole: string, requiredRoles: TenantRole[]): boolean {
    const roleHierarchy: Record<string, TenantRole[]> = {
      'OWNER': ['OWNER', 'ADMIN', 'MEMBER'],
      'ADMIN': ['ADMIN', 'MEMBER'],
      'MEMBER': ['MEMBER'],
    };

    const grantedRoles = roleHierarchy[userRole] || [];
    return requiredRoles.some((required) => grantedRoles.includes(required));
  }
}
