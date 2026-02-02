import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto, RoleResponseDto, UserRoleMappingResponseDto } from './dto';
import { RolesMapper } from './roles.mapper';
import { TenantContextService } from '../../common/tenant';
import { SubscriptionService } from '../../common/subscription';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly tenantContext: TenantContextService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    // Check if custom roles feature is available for current plan
    const hasCustomRoles = await this.subscriptionService.hasFeature('customRoles');
    if (!hasCustomRoles) {
      throw new ForbiddenException(
        'Custom roles are not available on the FREE plan. Please upgrade to STARTER or higher to create custom roles.'
      );
    }

    const existing = await this.rolesRepository.findRoleByName(dto.roleName);
    if (existing) {
      throw new ConflictException('Role already exists');
    }

    const role = await this.rolesRepository.createRole({
      roleName: dto.roleName,
      description: dto.description,
      color: dto.color,
    });

    return RolesMapper.toResponse(role);
  }

  async findAll(): Promise<RoleResponseDto[]> {
    // Always exclude Super Admin - it's a platform-level role, not for tenant users
    const platformRoles = ['Super Admin'];
    
    // Get subscription features to check if custom roles are enabled
    const hasCustomRoles = await this.subscriptionService.hasFeature('customRoles');
    
    // Fetch roles excluding platform roles
    const roles = await this.rolesRepository.findAllRoles(platformRoles);
    
    // For FREE plan (no custom roles feature), only return system roles
    // Note: System roles have isSystem: true (e.g., Admin, User created per-tenant)
    if (!hasCustomRoles) {
      const systemRoles = roles.filter(role => role.isSystem === true);
      return RolesMapper.toResponseList(systemRoles);
    }
    
    return RolesMapper.toResponseList(roles);
  }

  async assignRole(roleId: string, userId: string): Promise<UserRoleMappingResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify the user belongs to this tenant
    const userMembership = await this.rolesRepository.verifyUserInTenant(BigInt(userId), tenantId);
    if (!userMembership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    // Verify role is accessible for this tenant (system role or tenant's custom role)
    const role = await this.rolesRepository.findRoleById(BigInt(roleId));
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // If role belongs to a different tenant, deny access
    if (role.tenantId !== null && role.tenantId !== tenantId) {
      throw new ForbiddenException('Role is not available in this organization');
    }

    const existing = await this.rolesRepository.findRoleMapping(BigInt(userId), BigInt(roleId));
    if (existing) {
      throw new ConflictException('User already has this role');
    }

    const mapping = await this.rolesRepository.assignRole(BigInt(userId), BigInt(roleId));
    return RolesMapper.mappingToResponse(mapping);
  }

  async unassignRole(roleId: string, userId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify the user belongs to this tenant
    const userMembership = await this.rolesRepository.verifyUserInTenant(BigInt(userId), tenantId);
    if (!userMembership) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    const role = await this.rolesRepository.findRoleById(BigInt(roleId));
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // If role belongs to a different tenant, deny access
    if (role.tenantId !== null && role.tenantId !== tenantId) {
      throw new ForbiddenException('Role is not available in this organization');
    }

    await this.rolesRepository.unassignRole(BigInt(userId), BigInt(roleId));
  }

  async getUserRoles(userId: string): Promise<RoleResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const mappings = await this.rolesRepository.findUserRoles(BigInt(userId));
    // The mappings include the role relation via include
    return mappings.map((m) => {
      const mapping = m as any;
      return {
        roleId: mapping.role.roleId.toString(),
        roleName: mapping.role.roleName,
        description: mapping.role.description || null,
        color: mapping.role.color || null,
        createdAt: mapping.role.createdAt?.toISOString() || new Date().toISOString(),
      };
    });
  }
}
