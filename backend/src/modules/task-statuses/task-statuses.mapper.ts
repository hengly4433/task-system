import { TaskStatus } from '@prisma/client';
import { TaskStatusResponseDto } from './dto';

export class TaskStatusesMapper {
  static toResponse(status: TaskStatus): TaskStatusResponseDto {
    return {
      statusId: status.statusId.toString(),
      projectId: status.projectId?.toString() || null,
      departmentId: status.departmentId?.toString() || null,
      name: status.name,
      code: status.code,
      color: status.color,
      sortOrder: status.sortOrder,
      isDefault: status.isDefault,
      isTerminal: status.isTerminal,
      createdAt: status.createdAt.toISOString(),
      updatedAt: status.updatedAt.toISOString(),
    };
  }

  static toResponseList(statuses: TaskStatus[]): TaskStatusResponseDto[] {
    return statuses.map(this.toResponse);
  }
}
