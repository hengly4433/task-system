import { Project, ProjectMember } from '@prisma/client';
import { ProjectResponseDto, ProjectMemberResponseDto } from './dto';

export class ProjectsMapper {
  static toResponse(project: Project): ProjectResponseDto {
    return {
      projectId: project.projectId.toString(),
      projectName: project.projectName,
      description: project.description,
      startDate: project.startDate?.toISOString() || null,
      endDate: project.endDate?.toISOString() || null,
      ownerId: project.ownerId.toString(),
      createdBy: project.createdBy.toString(),
      teamId: project.teamId?.toString() || null,
      workspaceId: project.workspaceId?.toString() || null,
      departmentId: project.departmentId?.toString() || null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  static toResponseWithCounts(
    project: Project & { _count: { tasks: number }; completedTaskCount: number },
  ): ProjectResponseDto {
    return {
      projectId: project.projectId.toString(),
      projectName: project.projectName,
      description: project.description,
      startDate: project.startDate?.toISOString() || null,
      endDate: project.endDate?.toISOString() || null,
      ownerId: project.ownerId.toString(),
      createdBy: project.createdBy.toString(),
      teamId: project.teamId?.toString() || null,
      workspaceId: project.workspaceId?.toString() || null,
      departmentId: project.departmentId?.toString() || null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      taskCount: project._count.tasks,
      completedTaskCount: project.completedTaskCount,
    };
  }

  static toResponseList(projects: Project[]): ProjectResponseDto[] {
    return projects.map((p) => this.toResponse(p));
  }

  static toResponseListWithCounts(
    projects: (Project & { _count: { tasks: number }; completedTaskCount: number })[],
  ): ProjectResponseDto[] {
    return projects.map((p) => this.toResponseWithCounts(p));
  }

  static memberToResponse(member: ProjectMember): ProjectMemberResponseDto {
    return {
      memberId: member.memberId.toString(),
      projectId: member.projectId.toString(),
      userId: member.userId.toString(),
      joinedAt: member.joinedAt.toISOString(),
    };
  }
}
