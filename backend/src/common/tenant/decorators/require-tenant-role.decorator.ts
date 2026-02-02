import { SetMetadata } from '@nestjs/common';

/**
 * Key for storing required tenant roles in metadata.
 */
export const TENANT_ROLES_KEY = 'requiredTenantRoles';

/**
 * Type for tenant roles - matches TenantMember.role values
 */
export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * Decorator to require specific tenant roles for access to a route.
 * 
 * This checks the user's role within the current tenant context.
 * Multiple roles can be specified - the user needs at least one of them.
 * 
 * Usage:
 * ```typescript
 * @RequireTenantRole('OWNER', 'ADMIN')
 * @Post()
 * createUser() {
 *   // Only tenant owners and admins can access this
 * }
 * ```
 * 
 * Role hierarchy (for reference):
 * - OWNER: Full control of the tenant
 * - ADMIN: Can manage most resources but not tenant settings
 * - MEMBER: Basic access to assigned resources
 */
export const RequireTenantRole = (...roles: TenantRole[]) =>
  SetMetadata(TENANT_ROLES_KEY, roles);
