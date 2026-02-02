import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { AuditService } from '../../common/audit';
import { MoveTaskDto, BoardViewResponseDto, BoardTaskResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

// Default Kanban columns
const DEFAULT_COLUMNS = [
  { name: 'TODO', position: 0 },
  { name: 'IN_PROGRESS', position: 1 },
  { name: 'REVIEW', position: 2 },
  { name: 'DONE', position: 3 },
];

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getBoardView(projectId: string): Promise<BoardViewResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.prisma.project.findFirst({
      where: { 
        projectId: BigInt(projectId), 
        tenantId,
        deletedAt: null 
      },
    });
    if (!project) throw new NotFoundException('Project not found in this tenant');

    const tasks = await this.prisma.task.findMany({
      where: { 
        projectId: BigInt(projectId), 
        deletedAt: null, 
        parentTaskId: null,
        project: {
          tenantId,
        },
      },
      include: { assignee: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group tasks by status
    const tasksByStatus: Record<string, BoardTaskResponseDto[]> = {};
    for (const col of DEFAULT_COLUMNS) {
      tasksByStatus[col.name] = [];
    }

    for (const task of tasks) {
      const status = task.status || 'TODO';
      if (!tasksByStatus[status]) tasksByStatus[status] = [];
      tasksByStatus[status].push({
        taskId: task.taskId.toString(),
        taskName: task.taskName,
        status: task.status,
        priority: task.priority,
        percentComplete: task.percentComplete,
        assigneeId: task.assignedTo?.toString() || null,
        assigneeName: task.assignee?.fullName || task.assignee?.username || null,
      });
    }

    // Build columns with task counts
    const columns = DEFAULT_COLUMNS.map((col) => ({
      columnId: col.name,
      name: col.name.replace('_', ' '),
      position: col.position,
      taskCount: tasksByStatus[col.name]?.length || 0,
    }));

    return {
      projectId: project.projectId.toString(),
      projectName: project.projectName,
      columns,
      tasks: tasksByStatus,
    };
  }

  async moveTask(taskId: string, dto: MoveTaskDto, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const task = await this.prisma.task.findFirst({
      where: { 
        taskId: BigInt(taskId), 
        deletedAt: null,
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    // If moving to DONE, set completedAt and percentComplete to 100
    const isDone = dto.status === 'DONE';
    const completedAt = isDone && task.status !== 'DONE' ? new Date() : undefined;
    const percentComplete = isDone ? 100 : undefined;

    await this.prisma.task.update({
      where: { taskId: BigInt(taskId) },
      data: { 
        status: dto.status,
        ...(completedAt && { completedAt }),
        ...(percentComplete !== undefined && { percentComplete }),
      },
    });

    await this.auditService.logTaskHistory({
      taskId: BigInt(taskId),
      changedBy: userId,
      changeDescription: `Moved to ${dto.status}`,
    });
  }

  async updateTaskProgress(taskId: string, percentComplete: number, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const task = await this.prisma.task.findFirst({
      where: { 
        taskId: BigInt(taskId), 
        deletedAt: null,
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    await this.prisma.task.update({
      where: { taskId: BigInt(taskId) },
      data: { percentComplete: Math.min(100, Math.max(0, percentComplete)) },
    });

    await this.auditService.logTaskHistory({
      taskId: BigInt(taskId),
      changedBy: userId,
      changeDescription: `Progress updated to ${percentComplete}%`,
    });
  }
}
