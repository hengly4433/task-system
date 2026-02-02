import { Task } from '@prisma/client';
import { TaskResponseDto } from './dto';

export class TasksMapper {
  static toResponse(task: Task): TaskResponseDto {
    const taskAny = task as any;
    return {
      taskId: task.taskId.toString(),
      projectId: task.projectId.toString(),
      parentTaskId: task.parentTaskId?.toString() || null,
      taskName: task.taskName,
      description: task.description,
      status: task.status,
      priority: task.priority,
      taskType: taskAny.taskType || 'TASK',
      estimatedHours: taskAny.estimatedHours !== null ? Number(taskAny.estimatedHours) : null,
      remainingHours: taskAny.remainingHours !== null ? Number(taskAny.remainingHours) : null,
      storyPoints: taskAny.storyPoints || null,
      createdBy: task.createdBy.toString(),
      assignedTo: task.assignedTo?.toString() || null,
      testerId: taskAny.testerId?.toString() || null,
      dueDate: task.dueDate?.toISOString() || null,
      startDate: taskAny.startDate?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null,
      sprintId: task.sprintId?.toString() || null,
      // DETAILS section fields
      // DETAILS section fields
      milestoneId: taskAny.milestoneId?.toString() || null,
      milestone: taskAny.milestone ? {
        milestoneId: taskAny.milestone.milestoneId?.toString(),
        milestoneName: taskAny.milestone.milestoneName,
      } : null,
      team: taskAny.team || null,
      teamId: taskAny.teamId?.toString() || null,
      assignedTeam: taskAny.assignedTeam ? {
        teamId: taskAny.assignedTeam.teamId.toString(),
        teamName: taskAny.assignedTeam.teamName,
      } : undefined,
      module: taskAny.module || null,
      externalLink: taskAny.externalLink || null,
      buildVersion: taskAny.buildVersion || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assignee: taskAny.assignee
        ? {
            userId: taskAny.assignee.userId.toString(),
            username: taskAny.assignee.username,
            fullName: taskAny.assignee.fullName || null,
            profileImageUrl: taskAny.assignee.profileImageUrl || null,
          }
        : undefined,
      tester: taskAny.tester
        ? {
            userId: taskAny.tester.userId.toString(),
            username: taskAny.tester.username,
            fullName: taskAny.tester.fullName || null,
            profileImageUrl: taskAny.tester.profileImageUrl || null,
          }
        : undefined,
      creator: taskAny.creator
        ? {
            userId: taskAny.creator.userId.toString(),
            username: taskAny.creator.username,
            fullName: taskAny.creator.fullName || null,
            profileImageUrl: taskAny.creator.profileImageUrl || null,
          }
        : undefined,
      parent: taskAny.parent
        ? {
            taskId: taskAny.parent.taskId.toString(),
            taskName: taskAny.parent.taskName,
          }
        : undefined,
      project: taskAny.project
        ? {
            projectId: taskAny.project.projectId.toString(),
            name: taskAny.project.projectName,
          }
        : undefined,
      sprint: taskAny.sprint
        ? {
            sprintId: taskAny.sprint.sprintId.toString(),
            sprintName: taskAny.sprint.sprintName,
          }
        : undefined,
      watcherCount: taskAny._count?.watchers,
    };
  }

  static toResponseList(tasks: Task[]): TaskResponseDto[] {
    return tasks.map((t) => this.toResponse(t));
  }
}
