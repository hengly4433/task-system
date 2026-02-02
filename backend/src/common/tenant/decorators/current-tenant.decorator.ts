import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Tenant } from '@prisma/client';

/**
 * Parameter decorator to get the current tenant from the request.
 * 
 * Usage:
 * ```typescript
 * @Get()
 * findAll(@CurrentTenant() tenant: Tenant) {
 *   // tenant is the full Tenant object
 * }
 * 
 * // Or get specific property
 * @Get()
 * findAll(@CurrentTenant('tenantId') tenantId: bigint) {
 *   // tenantId is just the tenant ID
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: keyof Tenant | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant as Tenant | undefined;

    if (!tenant) {
      return undefined;
    }

    return data ? tenant[data] : tenant;
  },
);

/**
 * Parameter decorator to get just the tenant ID as a bigint.
 * Convenience wrapper around @CurrentTenant('tenantId')
 */
export const CurrentTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): bigint | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId as bigint | undefined;
  },
);
