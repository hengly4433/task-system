import { Department } from '@prisma/client';
import { DepartmentResponseDto } from './dto';

export class DepartmentsMapper {
  static toResponse(department: Department & { _count?: { users?: number; workspaces?: number } }): DepartmentResponseDto {
    return {
      departmentId: department.departmentId.toString(),
      name: department.name,
      code: department.code,
      description: department.description,
      isActive: department.isActive,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      userCount: department._count?.users,
      workspaceCount: department._count?.workspaces,
    };
  }

  static toResponseList(departments: (Department & { _count?: { users?: number; workspaces?: number } })[]): DepartmentResponseDto[] {
    return departments.map(this.toResponse);
  }
}
