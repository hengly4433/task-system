import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiProperty({ description: 'Role name' })
  roleName: string;

  @ApiPropertyOptional({ description: 'Role description' })
  description: string | null;

  @ApiPropertyOptional({ description: 'Hex color code' })
  color: string | null;

  @ApiPropertyOptional({ description: 'Whether this is a system role' })
  isSystem?: boolean;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;
}

export class UserRoleMappingResponseDto {
  @ApiProperty({ description: 'Mapping ID' })
  mappingId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiProperty({ description: 'Assignment date' })
  assignedAt: string;
}
