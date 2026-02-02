import { User } from '@prisma/client';
import { UserResponseDto } from './dto';

export class UsersMapper {
  static toResponse(user: any): UserResponseDto {
    return {
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      profileImageUrl: user.profileImageUrl || null,
      positionId: user.positionId?.toString() || null,
      position: user.position ? {
        positionId: user.position.positionId.toString(),
        positionName: user.position.positionName,
      } : null,
      roles: user.roles?.map((ur: any) => ({
        roleId: ur.role.roleId.toString(),
        roleName: ur.role.roleName,
      })) || [],
      departments: user.departments?.map((ud: any) => ({
        departmentId: ud.department.departmentId.toString(),
        name: ud.department.name,
        isPrimary: ud.isPrimary,
      })) || [],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static toResponseList(users: any[]): UserResponseDto[] {
    return users.map((user) => this.toResponse(user));
  }
}
