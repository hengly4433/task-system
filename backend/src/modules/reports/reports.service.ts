import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { ProjectReportDto, TeamPerformanceDto, TimeSummaryDto, DashboardSummaryDto, TaskStatusSummaryDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getProjectReport(projectId: string): Promise<ProjectReportDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.prisma.project.findFirst({
      where: {
        projectId: BigInt(projectId),
        tenantId,
        deletedAt: null,
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: BigInt(projectId),
        project: {
          tenantId,
        },
        deletedAt: null,
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
    const now = new Date();
    const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== 'DONE').length;
    const avgProgress = totalTasks > 0 ? Math.round(tasks.reduce((acc, t) => acc + t.percentComplete, 0) / totalTasks) : 0;

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    tasks.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
    const statusBreakdown: TaskStatusSummaryDto[] = Object.entries(statusCounts).map(([status, count]) => ({
      status, count, percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
    }));

    return {
      projectId: project.projectId.toString(),
      projectName: project.projectName,
      totalTasks, completedTasks, overdueTasks,
      averageProgress: avgProgress,
      statusBreakdown,
    };
  }

  async getTeamPerformanceByProject(projectId: string): Promise<TeamPerformanceDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { projectId: BigInt(projectId), tenantId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId: BigInt(projectId),
        project: {
          tenantId,
        },
      },
      include: { user: true },
    });

    const result: TeamPerformanceDto[] = [];
    for (const member of members) {
      const assigned = await this.prisma.task.count({
        where: {
          projectId: BigInt(projectId),
          assignedTo: member.userId,
          project: {
            tenantId,
          },
          deletedAt: null,
        },
      });
      const completed = await this.prisma.task.count({
        where: {
          projectId: BigInt(projectId),
          assignedTo: member.userId,
          status: 'DONE',
          project: {
            tenantId,
          },
          deletedAt: null,
        },
      });
      const tasks = await this.prisma.task.findMany({
        where: {
          projectId: BigInt(projectId),
          assignedTo: member.userId,
          project: {
            tenantId,
          },
          deletedAt: null,
        },
      });
      const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((a, t) => a + t.percentComplete, 0) / tasks.length) : 0;

      const timeEntries = await this.prisma.timeEntry.findMany({
        where: {
          userId: member.userId,
          task: {
            projectId: BigInt(projectId),
            project: {
              tenantId,
            },
          },
        },
      });
      const totalMinutes = timeEntries.reduce((acc, te) => {
        return acc + (Number(te.hours) * 60);
      }, 0);

      result.push({
        userId: member.userId.toString(),
        userName: member.user.fullName || member.user.username,
        tasksAssigned: assigned,
        tasksCompleted: completed,
        totalTimeLogged: totalMinutes,
        averageProgress: avgProgress,
      });
    }
    return result;
  }

  async getTimeSummary(projectId: string): Promise<TimeSummaryDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const project = await this.prisma.project.findFirst({
      where: {
        projectId: BigInt(projectId),
        tenantId,
        deletedAt: null,
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        task: {
          projectId: BigInt(projectId),
          project: {
            tenantId,
          },
        },
      },
      include: { user: true },
    });

    const userMinutes: Record<string, { userId: string; userName: string; minutes: number }> = {};
    let totalMinutes = 0;

    for (const te of timeEntries) {
      const mins = Number(te.hours) * 60;
      totalMinutes += mins;
      const key = te.userId.toString();
      if (!userMinutes[key]) {
        userMinutes[key] = { userId: key, userName: te.user.fullName || te.user.username, minutes: 0 };
      }
      userMinutes[key].minutes += mins;
    }

    return {
      projectId: project.projectId.toString(),
      projectName: project.projectName,
      totalMinutes,
      userBreakdown: Object.values(userMinutes),
    };
  }

  async getDashboardSummary(userId: bigint): Promise<DashboardSummaryDto> {
    const tenantId = this.tenantContext.requireTenantId();
    
    const projects = await this.prisma.projectMember.count({
      where: {
        userId,
        project: {
          tenantId,
        },
      },
    });
    const tasks = await this.prisma.task.count({
      where: {
        assignedTo: userId,
        project: {
          tenantId,
        },
        deletedAt: null,
      },
    });
    const completed = await this.prisma.task.count({
      where: {
        assignedTo: userId,
        status: 'DONE',
        project: {
          tenantId,
        },
        deletedAt: null,
      },
    });
    const inProgress = await this.prisma.task.count({
      where: {
        assignedTo: userId,
        status: 'IN_PROGRESS',
        project: {
          tenantId,
        },
        deletedAt: null,
      },
    });
    
    const now = new Date();
    const overdue = await this.prisma.task.count({
      where: {
        assignedTo: userId,
        dueDate: { lt: now },
        status: { not: 'DONE' },
        project: {
          tenantId,
        },
        deletedAt: null,
      },
    });

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingMeetings = await this.prisma.meetingAttendee.count({
      where: {
        userId,
        meeting: {
          startTime: { gte: now, lt: tomorrow },
          tenantId,
        },
      },
    });

    return { totalProjects: projects, totalTasks: tasks, completedTasks: completed, inProgressTasks: inProgress, overdueTasks: overdue, upcomingMeetings };
  }

  // ============== NEW ENDPOINTS FOR REPORTS PAGE ==============

  async getTasksCompletedChart(startDate: string, endDate: string, userId?: bigint) {
    const tenantId = this.tenantContext.requireTenantId();
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: 'completed',
        updatedAt: { gte: start, lte: end },
        project: {
          tenantId,
        },
        ...(userId ? { assignedTo: userId } : {}),
      },
      orderBy: { updatedAt: 'asc' },
    });

    // Group by day
    const dayMap: Record<string, number> = {};
    const current = new Date(start);
    while (current <= end) {
      const key = current.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      dayMap[key] = 0;
      current.setDate(current.getDate() + 1);
    }

    for (const task of tasks) {
      const key = task.updatedAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (dayMap[key] !== undefined) {
        dayMap[key]++;
      }
    }

    return {
      labels: Object.keys(dayMap),
      data: Object.values(dayMap),
    };
  }

  async getSpentTimeByDepartment(startDate: string, endDate: string, teamId?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get time entries grouped by project
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        date: { gte: start, lte: end },
        task: {
          project: {
            tenantId,
            ...(teamId && teamId !== 'all' ? { teamId: BigInt(teamId) } : {}),
          },
        },
      },
      include: {
        task: {
          include: { project: true }
        }
      },
    });

    const projectHours: Record<string, { name: string; hours: number }> = {};
    const colors = ['#f1184c', '#FBBF24', '#EC4899', '#10B981', '#F97316', '#ff6b8a', '#06B6D4', '#8B5CF6'];
    
    for (const entry of timeEntries) {
      const projectName = entry.task?.project?.projectName || 'Unassigned';
      if (!projectHours[projectName]) {
        projectHours[projectName] = { name: projectName, hours: 0 };
      }
      projectHours[projectName].hours += Number(entry.hours);
    }

    const sorted = Object.values(projectHours).sort((a, b) => b.hours - a.hours);

    return {
      labels: sorted.map(p => p.name),
      data: sorted.map(p => Math.round(p.hours)),
      colors: sorted.map((_, i) => colors[i % colors.length]),
    };
  }

  async getGlobalTeamPerformance(teamId?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    
    // If teamId is provided, get users who are members of that team
    let userIds: bigint[] = [];
    
    if (teamId && teamId !== 'all') {
      const teamMembers = await this.prisma.teamMember.findMany({
        where: {
          teamId: BigInt(teamId),
          team: {
            tenantId,
          },
        },
        select: { userId: true },
      });
      userIds = teamMembers.map(m => m.userId);
    }

    const users = await this.prisma.user.findMany({
      where: {
        tenantMembers: {
          some: {
            tenantId,
          },
        },
        ...(userIds.length > 0 ? { userId: { in: userIds } } : {}),
      },
      take: 20,
    });

    const result = [];
    for (const user of users) {
      const tasksCompleted = await this.prisma.task.count({
        where: {
          assignedTo: user.userId,
          status: 'completed',
          project: {
            tenantId,
          },
          deletedAt: null,
        },
      });

      const timeEntries = await this.prisma.timeEntry.findMany({
        where: {
          userId: user.userId,
          task: {
            project: {
              tenantId,
            },
          },
        },
      });
      const hoursLogged = timeEntries.reduce((sum, te) => sum + Number(te.hours), 0);

      result.push({
        userId: user.userId.toString(),
        fullName: user.fullName || user.username,
        profileImageUrl: user.profileImageUrl,
        tasksCompleted,
        hoursLogged: Math.round(hoursLogged * 10) / 10,
      });
    }

    return result.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  }

  async getTimesheetSummary(startDate: string, endDate: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        date: { gte: start, lte: end },
        task: {
          project: {
            tenantId,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group by day
    const dayMap: Record<string, { logged: number; notLogged: number }> = {};
    const current = new Date(start);
    while (current <= end) {
      const key = current.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      dayMap[key] = { logged: 0, notLogged: 8 }; // Assume 8 hour workday
      current.setDate(current.getDate() + 1);
    }

    for (const entry of timeEntries) {
      const key = entry.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (dayMap[key] !== undefined) {
        const hours = Number(entry.hours);
        dayMap[key].logged += hours;
        dayMap[key].notLogged = Math.max(0, 8 - dayMap[key].logged);
      }
    }

    return {
      labels: Object.keys(dayMap),
      logged: Object.values(dayMap).map(d => Math.round(d.logged * 10) / 10),
      notLogged: Object.values(dayMap).map(d => Math.round(d.notLogged * 10) / 10),
    };
  }
}
