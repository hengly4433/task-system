import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ description: 'Permission ID' })
  permissionId: string;

  @ApiProperty({ description: 'Permission code' })
  code: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  description: string | null;

  @ApiProperty({ description: 'Category' })
  category: string;

  @ApiProperty({ description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;
}

export class RolePermissionResponseDto {
  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiProperty({ description: 'Permission ID' })
  permissionId: string;

  @ApiProperty({ description: 'Whether permission is granted' })
  granted: boolean;
}

export class RoleWithPermissionsResponseDto {
  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiProperty({ description: 'Role name' })
  roleName: string;

  @ApiPropertyOptional({ description: 'Role color' })
  color: string | null;

  @ApiProperty({ description: 'Permissions with grant status', type: [RolePermissionResponseDto] })
  permissions: RolePermissionResponseDto[];
}

export class PermissionsByCategoryResponseDto {
  @ApiProperty({ description: 'Category name' })
  category: string;

  @ApiProperty({ description: 'Permissions in this category', type: [PermissionResponseDto] })
  permissions: PermissionResponseDto[];
}
