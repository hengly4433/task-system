import { SetMetadata } from '@nestjs/common';
import { SKIP_TENANT_GUARD_KEY } from '../tenant.guard';

/**
 * Decorator to skip tenant guard for specific routes.
 * Use this for public endpoints or auth routes that don't require tenant context.
 * 
 * Usage:
 * ```typescript
 * @SkipTenantGuard()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipTenantGuard = () => SetMetadata(SKIP_TENANT_GUARD_KEY, true);
