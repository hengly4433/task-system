import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { CreateTaskDto, UpdateTaskDto, ListTasksQueryDto, TaskResponseDto } from './dto';
import { TasksMapper } from './tasks.mapper';
import { AuditService } from '../../common/audit';
import { PrismaService } from '../../common/database';
import { PaginatedResult, createPaginatedResult, getPaginationParams, getSortParams } from '../../common/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionService } from '../../common/subscription';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly tenantContext: TenantContextService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Validates that a statusId belongs to the specified projectId.
   * This is a critical production-ready validation to prevent wrong status/project combinations.
   */
  private async validateStatusBelongsToProject(statusId: bigint, projectId: bigint): Promise<void> {
    const status = await this.prisma.taskStatus.findUnique({
      where: { statusId },
      select: { projectId: true, departmentId: true, code: true },
    });

    if (!status) {
      throw new BadRequestException('Status not found');
    }

    // 1. Check Project Scope
    if (status.projectId === projectId) {
      return;
    }

    // 2. Check Department/Global Scope (status.projectId must be null)
    if (status.projectId === null) {
      // Global (no dept, no project)
      if (status.departmentId === null) {
        return;
      }
      
      // Department-level
      const project = await this.prisma.project.findUnique({
        where: { projectId },
        select: { departmentId: true },
      });

      if (project?.departmentId === status.departmentId) {
        return;
      }
    }

    throw new BadRequestException(
      `Status "${status.code}" does not belong to the specified project or its department. ` +
      `Tasks can only use statuses from their project's workflow.`
    );
  }

  /**
   * Gets the status code from a statusId, or returns the provided status string.
   * This supports backward compatibility during migration.
   */
  private async resolveStatusCode(statusId?: bigint, statusString?: string): Promise<string> {
    if (statusId) {
      const status = await this.prisma.taskStatus.findUnique({
        where: { statusId },
        select: { code: true },
      });
      return status?.code || statusString || 'TODO';
    }
    return statusString || 'TODO';
  }

  async create(projectId: string, dto: CreateTaskDto, userId: bigint): Promise<TaskResponseDto> {
    // Check subscription task limit before creating
    await this.subscriptionService.checkTaskLimit();

    // Validate status belongs to project if statusId is provided
    if (dto.statusId) {
      await this.validateStatusBelongsToProject(BigInt(dto.statusId), BigInt(projectId));
    }

    // Resolve status code for backward compatibility
    const statusCode = await this.resolveStatusCode(
      dto.statusId ? BigInt(dto.statusId) : undefined,
      dto.status
    );

    const task = await this.tasksRepository.create({
      taskName: dto.taskName,
      description: dto.description,
      status: statusCode,
      priority: dto.priority || 'MEDIUM',
      taskType: dto.taskType || 'TASK',
      estimatedHours: dto.estimatedHours,
      remainingHours: dto.remainingHours,
      storyPoints: dto.storyPoints,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      team: dto.team,
      module: dto.module,
      externalLink: dto.externalLink,
      buildVersion: dto.buildVersion,
      project: { connect: { projectId: BigInt(projectId) } },
      creator: { connect: { userId } },
      ...(dto.assignedTo && { assignee: { connect: { userId: BigInt(dto.assignedTo) } } }),
      ...(dto.testerId && { tester: { connect: { userId: BigInt(dto.testerId) } } }),
      ...(dto.parentTaskId && { parent: { connect: { taskId: BigInt(dto.parentTaskId) } } }),
      ...(dto.sprintId && { sprint: { connect: { sprintId: BigInt(dto.sprintId) } } }),
      ...(dto.teamId && { assignedTeam: { connect: { teamId: BigInt(dto.teamId) } } }),
      // Status connection (belongs to project)
      ...(dto.statusId && { taskStatus: { connect: { statusId: BigInt(dto.statusId) } } }),
    });

    await this.auditService.logActivity({
      userId,
      activityType: 'TASK_CREATED',
      details: `Created task: ${task.taskName}`,
    });

    return TasksMapper.toResponse(task);
  }

  async findById(taskId: string): Promise<TaskResponseDto> {
    const task = await this.tasksRepository.findById(
      BigInt(taskId),
      this.tenantContext.requireTenantId(),
    );
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return TasksMapper.toResponse(task);
  }

  async findByProject(projectId: string, query: ListTasksQueryDto): Promise<PaginatedResult<TaskResponseDto>> {
    const { skip, take } = getPaginationParams(query);
    const { orderBy } = getSortParams(query, ['taskName', 'createdAt', 'dueDate', 'priority']);

    let searchWhere: any = {};
    if (query.search) {
      const isIdSearch = /^#?(\d+)$/.exec(query.search);
      if (isIdSearch) {
        const searchId = BigInt(isIdSearch[1]);
        searchWhere = {
          OR: [
            { taskName: { contains: query.search, mode: 'insensitive' as const } },
            { taskId: searchId },
          ],
        };
      } else {
        searchWhere = {
          taskName: { contains: query.search, mode: 'insensitive' as const },
        };
      }
    }

    const where = {
      projectId: BigInt(projectId),
      project: { tenantId: this.tenantContext.requireTenantId() },
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignedTo ? { assignedTo: BigInt(query.assignedTo) } : {}),
      ...searchWhere,
    };

    const [tasks, totalItems] = await Promise.all([
      this.tasksRepository.findMany({ skip, take, where, orderBy }),
      this.tasksRepository.count(where),
    ]);

    return createPaginatedResult(TasksMapper.toResponseList(tasks), totalItems, query);
  }

  async findAll(query: ListTasksQueryDto, userId: bigint): Promise<PaginatedResult<TaskResponseDto>> {
    const { skip, take } = getPaginationParams(query);
    const { orderBy } = getSortParams(query, ['taskName', 'createdAt', 'dueDate', 'priority']);

    // Get the user's role and access information
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        departments: {
          select: {
            departmentId: true,
          },
        },
        projectMembers: {
          select: {
            projectId: true,
          },
        },
      },
    });

    // Check if user is Admin or SuperAdmin
    const isAdminOrSuperAdmin = user?.roles?.some(
      (rm: { role?: { roleName?: string } }) => rm.role?.roleName === 'Admin' || rm.role?.roleName === 'SuperAdmin'
    );

    let searchWhere: any = {};
    if (query.search) {
      const isIdSearch = /^#?(\d+)$/.exec(query.search);
      if (isIdSearch) {
        const searchId = BigInt(isIdSearch[1]);
        searchWhere = {
          OR: [
            { taskName: { contains: query.search, mode: 'insensitive' as const } },
            { taskId: searchId },
          ],
        };
      } else {
        searchWhere = {
          taskName: { contains: query.search, mode: 'insensitive' as const },
        };
      }
    }

    // Build access filter for non-admin users
    let accessFilter: any = {};
    if (!isAdminOrSuperAdmin && user) {
      const userDepartmentIds = user.departments.map((d: { departmentId: bigint }) => d.departmentId);
      const userProjectIds = user.projectMembers.map((p: { projectId: bigint }) => p.projectId);

      // User can see tasks that are:
      // 1. Assigned to them
      // 2. In projects they are a member of
      // 3. In projects that belong to their department(s)
      accessFilter = {
        OR: [
          // Tasks assigned to the user
          { assignedTo: userId },
          // Tasks in projects the user is a member of
          ...(userProjectIds.length > 0 ? [{ projectId: { in: userProjectIds } }] : []),
          // Tasks in projects that belong to user's departments
          ...(userDepartmentIds.length > 0
            ? [{
                project: {
                  departmentId: { in: userDepartmentIds },
                },
              }]
            : []),
        ],
      };
    }

    const where = {
      project: { tenantId: this.tenantContext.requireTenantId() },
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignedTo ? { assignedTo: BigInt(query.assignedTo) } : {}),
      ...searchWhere,
      ...accessFilter,
    };

    const [tasks, totalItems] = await Promise.all([
      this.tasksRepository.findMany({ skip, take, where, orderBy }),
      this.tasksRepository.count(where),
    ]);

    return createPaginatedResult(TasksMapper.toResponseList(tasks), totalItems, query);
  }

  async update(taskId: string, dto: UpdateTaskDto, userId: bigint): Promise<TaskResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const task = await this.tasksRepository.findById(BigInt(taskId), tenantId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const changes: string[] = [];

    // Track what changed for history
    if (dto.taskName && dto.taskName !== task.taskName) {
      changes.push(`Name: ${task.taskName} → ${dto.taskName}`);
    }
    if (dto.description !== undefined && dto.description !== task.description) {
      changes.push(`Description updated`);
    }
    if (dto.status && dto.status !== task.status) {
      changes.push(`Status: ${task.status} → ${dto.status}`);
    }
    if (dto.priority && dto.priority !== task.priority) {
      changes.push(`Priority: ${task.priority} → ${dto.priority}`);
    }
    if (dto.taskType && dto.taskType !== (task as any).taskType) {
      changes.push(`Type: ${(task as any).taskType} → ${dto.taskType}`);
    }
    if (dto.storyPoints !== undefined && dto.storyPoints !== (task as any).storyPoints) {
      changes.push(`Story Points: ${(task as any).storyPoints || '-'} → ${dto.storyPoints}`);
    }
    if (dto.estimatedHours !== undefined && dto.estimatedHours !== (task as any).estimatedHours) {
      changes.push(`Estimated Hours: ${(task as any).estimatedHours || '-'} → ${dto.estimatedHours}`);
    }
    if (dto.remainingHours !== undefined && dto.remainingHours !== (task as any).remainingHours) {
      changes.push(`Remaining Hours: ${(task as any).remainingHours || '-'} → ${dto.remainingHours}`);
    }
    if (dto.assignedTo !== undefined && BigInt(dto.assignedTo || 0) !== task.assignedTo) {
      changes.push(`Assignee changed`);
    }
    if (dto.testerId !== undefined) {
      const oldTesterId = (task as any).testerId;
      const newTesterId = dto.testerId ? BigInt(dto.testerId) : null;
      if ((oldTesterId || null) !== newTesterId && (!oldTesterId || !newTesterId || oldTesterId !== newTesterId)) {
        changes.push(`Tester changed`);
      }
    }
    if (dto.dueDate !== undefined) {
      const oldDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'None';
      const newDueDate = dto.dueDate || 'None';
      if (oldDueDate !== newDueDate) {
        changes.push(`Due Date: ${oldDueDate} → ${newDueDate}`);
      }
    }
    if (dto.startDate !== undefined) {
      const oldStartDate = (task as any).startDate ? new Date((task as any).startDate).toISOString().split('T')[0] : 'None';
      const newStartDate = dto.startDate || 'None';
      if (oldStartDate !== newStartDate) {
        changes.push(`Start Date: ${oldStartDate} → ${newStartDate}`);
      }
    }
    if (dto.sprintId !== undefined) {
      const oldSprintId = task.sprintId ? task.sprintId.toString() : 'None';
      const newSprintId = dto.sprintId ? dto.sprintId.toString() : 'None';
      if (oldSprintId !== newSprintId) {
        changes.push(`Sprint changed`);
      }
    }
    if (dto.milestoneId !== undefined) {
      const oldMilestoneId = (task as any).milestoneId ? (task as any).milestoneId.toString() : 'None';
      const newMilestoneId = dto.milestoneId ? dto.milestoneId.toString() : 'None';
      if (oldMilestoneId !== newMilestoneId) {
        changes.push(`Milestone changed`);
      }
    }
    if (dto.teamId !== undefined) {
      const oldTeamId = (task as any).teamId ? (task as any).teamId.toString() : 'None';
      const newTeamId = dto.teamId ? dto.teamId.toString() : 'None';
      if (oldTeamId !== newTeamId) {
        changes.push(`Team changed`);
      }
    }
    if (dto.team !== undefined && dto.team !== (task as any).team) {
      changes.push(`Team: ${(task as any).team || '-'} → ${dto.team || '-'}`);
    }
    if (dto.module !== undefined && dto.module !== (task as any).module) {
      changes.push(`Module: ${(task as any).module || '-'} → ${dto.module || '-'}`);
    }
    if (dto.externalLink !== undefined && dto.externalLink !== (task as any).externalLink) {
      changes.push(`External Link updated`);
    }
    if (dto.buildVersion !== undefined && dto.buildVersion !== (task as any).buildVersion) {
      changes.push(`Build Version: ${(task as any).buildVersion || '-'} → ${dto.buildVersion || '-'}`);
    }

    if (dto.parentTaskId !== undefined) {
      if (dto.parentTaskId && BigInt(dto.parentTaskId) === BigInt(taskId)) {
        throw new BadRequestException('A task cannot be its own parent');
      }
      const oldParentId = task.parentTaskId ? task.parentTaskId.toString() : 'None';
      const newParentId = dto.parentTaskId ? dto.parentTaskId.toString() : 'None';
      if (oldParentId !== newParentId) {
        changes.push(`Parent Task: ${oldParentId} → ${newParentId}`);
      }
    }

    const completedAt = dto.status === 'DONE' && task.status !== 'DONE' ? new Date() : undefined;

    const updatedTask = await this.tasksRepository.update(BigInt(taskId), tenantId, {
      ...(dto.taskName && { taskName: dto.taskName }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status && { status: dto.status }),
      ...(dto.priority && { priority: dto.priority }),
      ...(dto.taskType && { taskType: dto.taskType }),
      ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
      ...(dto.remainingHours !== undefined && { remainingHours: dto.remainingHours }),
      ...(dto.storyPoints !== undefined && { storyPoints: dto.storyPoints }),
      ...(dto.assignedTo !== undefined &&
        (dto.assignedTo === null
          ? { assignee: { disconnect: true } }
          : { assignee: { connect: { userId: BigInt(dto.assignedTo) } } })),
      ...(dto.testerId !== undefined &&
        (dto.testerId === null
          ? { tester: { disconnect: true } }
          : { tester: { connect: { userId: BigInt(dto.testerId) } } })),
      ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.sprintId !== undefined &&
        (dto.sprintId === null
          ? { sprint: { disconnect: true } }
          : { sprint: { connect: { sprintId: BigInt(dto.sprintId) } } })),
      // DETAILS fields
      ...(dto.milestoneId !== undefined &&
        (dto.milestoneId === null
          ? { milestone: { disconnect: true } }
          : { milestone: { connect: { milestoneId: BigInt(dto.milestoneId) } } })),
      ...(dto.team !== undefined && { team: dto.team }),
      ...(dto.teamId !== undefined &&
        (dto.teamId === null
          ? { assignedTeam: { disconnect: true } }
          : { assignedTeam: { connect: { teamId: BigInt(dto.teamId) } } })),
      ...(dto.module !== undefined && { module: dto.module }),
      ...(dto.externalLink !== undefined && { externalLink: dto.externalLink }),
      ...(dto.buildVersion !== undefined && { buildVersion: dto.buildVersion }),
      ...(dto.parentTaskId !== undefined &&
        (dto.parentTaskId === null
          ? { parent: { disconnect: true } }
          : { parent: { connect: { taskId: BigInt(dto.parentTaskId) } } })),
      ...(completedAt && { completedAt }),
    });

    // Log task history if there were changes
    if (changes.length > 0) {
      await this.auditService.logTaskHistory({
        taskId: BigInt(taskId),
        changedBy: userId,
        changeDescription: changes.join(', '),
      });
    }

    await this.auditService.logActivity({
      userId,
      activityType: 'TASK_UPDATED',
      details: `Updated task: ${updatedTask.taskName}`,
    });

    // Notify task stakeholders based on what changed
    if (dto.status && dto.status !== task.status) {
      await this.notificationsService.notifyTaskStakeholders(
        BigInt(taskId),
        userId,
        'TASK_STATUS_UPDATED',
        { newStatus: dto.status },
      );
    }
    if (dto.priority && dto.priority !== task.priority) {
      await this.notificationsService.notifyTaskStakeholders(
        BigInt(taskId),
        userId,
        'TASK_PRIORITY_UPDATED',
        { newPriority: dto.priority },
      );
    }
    if (dto.assignedTo !== undefined && BigInt(dto.assignedTo || 0) !== task.assignedTo) {
      await this.notificationsService.notifyTaskStakeholders(
        BigInt(taskId),
        userId,
        task.assignedTo ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED',
        { newAssigneeId: dto.assignedTo?.toString() },
      );
    }
    if (dto.sprintId !== undefined && BigInt(dto.sprintId || 0) !== (task.sprintId || BigInt(0))) {
      // Fetch sprint name for notification
      let sprintName = 'a sprint';
      if (dto.sprintId) {
        const sprint = await this.prisma.sprint.findUnique({
          where: { sprintId: BigInt(dto.sprintId) },
        });
        sprintName = sprint?.sprintName || sprintName;
      }
      await this.notificationsService.notifyTaskStakeholders(
        BigInt(taskId),
        userId,
        'SPRINT_UPDATED',
        { sprintId: dto.sprintId?.toString(), sprintName },
      );
    }

    // Notify for due date changes
    if (dto.dueDate !== undefined) {
      const oldDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;
      if (oldDueDate !== dto.dueDate) {
        await this.notificationsService.notifyTaskStakeholders(
          BigInt(taskId),
          userId,
          'DUE_DATE_UPDATED',
          { newDueDate: dto.dueDate || 'removed' },
        );
      }
    }

    // Notify for description changes
    if (dto.description !== undefined && dto.description !== task.description) {
      await this.notificationsService.notifyTaskStakeholders(
        BigInt(taskId),
        userId,
        'DESCRIPTION_UPDATED',
      );
    }

    // Notify for milestone changes
    if (dto.milestoneId !== undefined) {
      const oldMilestoneId = (task as any).milestoneId;
      const newMilestoneId = dto.milestoneId ? BigInt(dto.milestoneId) : null;
      if ((oldMilestoneId?.toString() || null) !== (newMilestoneId?.toString() || null)) {
        let milestoneName = 'a milestone';
        if (dto.milestoneId) {
          const milestone = await this.prisma.milestone.findUnique({
            where: { milestoneId: BigInt(dto.milestoneId) },
          });
          milestoneName = milestone?.milestoneName || milestoneName;
        }
        await this.notificationsService.notifyTaskStakeholders(
          BigInt(taskId),
          userId,
          'MILESTONE_UPDATED',
          { milestoneName },
        );
      }
    }

    // Notify for tester assignment
    if (dto.testerId !== undefined) {
      const oldTesterId = (task as any).testerId;
      const newTesterId = dto.testerId ? BigInt(dto.testerId) : null;
      if ((oldTesterId?.toString() || null) !== (newTesterId?.toString() || null)) {
        let testerName = 'a tester';
        if (dto.testerId) {
          const tester = await this.prisma.user.findUnique({
            where: { userId: BigInt(dto.testerId) },
            select: { fullName: true, username: true },
          });
          testerName = tester?.fullName || tester?.username || testerName;
        }
        await this.notificationsService.notifyTaskStakeholders(
          BigInt(taskId),
          userId,
          'TESTER_ASSIGNED',
          { testerName },
        );
      }
    }

    return TasksMapper.toResponse(updatedTask);
  }

  async softDelete(taskId: string, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const task = await this.tasksRepository.findById(BigInt(taskId), tenantId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Notify stakeholders before deletion
    await this.notificationsService.notifyTaskStakeholders(
      BigInt(taskId),
      userId,
      'TASK_DELETED',
    );

    // Log history
    await this.auditService.logTaskHistory({
      taskId: BigInt(taskId),
      changedBy: userId,
      changeDescription: 'Task deleted',
    });

    await this.tasksRepository.softDelete(BigInt(taskId), tenantId);

    await this.auditService.logActivity({
      userId,
      activityType: 'TASK_DELETED',
      details: `Deleted task: ${task.taskName}`,
    });
  }

  async getSubtasks(taskId: string): Promise<TaskResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const task = await this.tasksRepository.findById(BigInt(taskId), tenantId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const children = await this.tasksRepository.findChildren(BigInt(taskId), tenantId);
    return TasksMapper.toResponseList(children);
  }

  async getHistory(taskId: string): Promise<any[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const task = await this.tasksRepository.findById(BigInt(taskId), tenantId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const history = await this.prisma.taskHistory.findMany({
      where: { taskId: BigInt(taskId) },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
    });

    return history.map((h) => ({
      historyId: h.historyId.toString(),
      taskId: h.taskId.toString(),
      changedBy: h.changedBy.toString(),
      changeDescription: h.changeDescription,
      changedAt: h.changedAt.toISOString(),
      user: h.user
        ? {
            userId: h.user.userId.toString(),
            fullName: h.user.fullName,
            profileImageUrl: h.user.profileImageUrl,
          }
        : undefined,
    }));
  }
}
