import { Role, UserRoleMapping } from '@prisma/client';
import { RoleResponseDto, UserRoleMappingResponseDto } from './dto';

export class RolesMapper {
  static toResponse(role: Role): RoleResponseDto {
    return {
      roleId: role.roleId.toString(),
      roleName: role.roleName,
      description: role.description,
      color: role.color,
      isSystem: role.isSystem,
      createdAt: role.createdAt.toISOString(),
    };
  }

  static toResponseList(roles: Role[]): RoleResponseDto[] {
    return roles.map((role) => this.toResponse(role));
  }

  static mappingToResponse(mapping: UserRoleMapping): UserRoleMappingResponseDto {
    return {
      mappingId: mapping.mappingId.toString(),
      userId: mapping.userId.toString(),
      roleId: mapping.roleId.toString(),
      assignedAt: mapping.assignedAt.toISOString(),
    };
  }
}
