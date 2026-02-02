import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PositionDto {
  @ApiProperty()
  positionId: string;

  @ApiProperty()
  positionName: string;
}

class RoleDto {
  @ApiProperty()
  roleId: string;

  @ApiProperty()
  roleName: string;
}

class DepartmentDto {
  @ApiProperty()
  departmentId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isPrimary: boolean;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiPropertyOptional({ description: 'Full name' })
  fullName: string | null;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  profileImageUrl: string | null;

  @ApiPropertyOptional({ description: 'Position ID' })
  positionId: string | null;

  @ApiPropertyOptional({ description: 'Position details', type: () => PositionDto })
  position: PositionDto | null;

  @ApiPropertyOptional({ description: 'User roles', type: () => [RoleDto] })
  roles: RoleDto[];

  @ApiPropertyOptional({ description: 'User departments', type: () => [DepartmentDto] })
  departments: DepartmentDto[];

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: string;
}

