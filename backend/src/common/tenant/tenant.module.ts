import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantService } from './tenant.service';
import { TenantGuard } from './tenant.guard';
import { TenantRoleGuard } from './tenant-role.guard';

/**
 * Global module providing tenant context services for multi-tenancy support.
 * 
 * Exports:
 * - TenantContextService: Request-scoped service for tenant context
 * - TenantService: Service for tenant operations
 * - TenantGuard: Guard for tenant validation
 * - TenantRoleGuard: Guard for tenant role authorization
 */
@Global()
@Module({
  providers: [TenantContextService, TenantService, TenantGuard, TenantRoleGuard],
  exports: [TenantContextService, TenantService, TenantGuard, TenantRoleGuard],
})
export class TenantModule {}

