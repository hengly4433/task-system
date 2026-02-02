export class DepartmentResponseDto {
  departmentId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userCount?: number;
  workspaceCount?: number;
}
