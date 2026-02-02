import { Permission, RolePermission } from '@prisma/client';
import { PermissionResponseDto, RolePermissionResponseDto } from './dto';

export class PermissionsMapper {
  static toResponse(permission: Permission): PermissionResponseDto {
    return {
      permissionId: permission.permissionId.toString(),
      code: permission.code,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      sortOrder: permission.sortOrder,
      createdAt: permission.createdAt.toISOString(),
    };
  }

  static toResponseList(permissions: Permission[]): PermissionResponseDto[] {
    return permissions.map((p) => this.toResponse(p));
  }

  static rolePermissionToResponse(rp: RolePermission): RolePermissionResponseDto {
    return {
      roleId: rp.roleId.toString(),
      permissionId: rp.permissionId.toString(),
      granted: rp.granted,
    };
  }

  static rolePermissionsToResponseList(rolePermissions: RolePermission[]): RolePermissionResponseDto[] {
    return rolePermissions.map((rp) => this.rolePermissionToResponse(rp));
  }
}
