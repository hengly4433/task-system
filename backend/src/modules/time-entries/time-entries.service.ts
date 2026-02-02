import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { 
  CreateTimeEntryDto, 
  UpdateTimeEntryDto, 
  TimeEntryFiltersDto,
  TimeEntryResponseDto, 
  WeeklyTimesheetResponseDto,
  WeeklyTimeEntryDto,
} from './dto';
import { Decimal } from '@prisma/client/runtime/library';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class TimeEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateTimeEntryDto, userId: bigint): Promise<TimeEntryResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const entryDate = new Date(dto.date);

    // Verify task belongs to tenant
    const task = await this.prisma.task.findFirst({
      where: {
        taskId: BigInt(dto.taskId),
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    // Verify user belongs to tenant
    const userMember = await this.prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });
    if (!userMember) throw new ForbiddenException('User is not a member of this tenant');

    // Check if entry already exists for this task/user/date - if so, update it
    const existing = await this.prisma.timeEntry.findFirst({
      where: {
        taskId: BigInt(dto.taskId),
        userId,
        date: entryDate,
        task: {
          project: {
            tenantId,
          },
        },
      },
    });

    if (existing) {
      // Update existing entry
      const updated = await this.prisma.timeEntry.update({
        where: { timeEntryId: existing.timeEntryId },
        data: {
          hours: new Decimal(dto.hours),
          description: dto.description,
        },
        include: {
          task: {
            select: { taskId: true, taskName: true, projectId: true, project: { select: { projectId: true, projectName: true } } },
          },
        },
      });
      return this.mapToResponse(updated);
    }

    // Create new entry
    const entry = await this.prisma.timeEntry.create({
      data: {
        taskId: BigInt(dto.taskId),
        userId,
        date: entryDate,
        hours: new Decimal(dto.hours),
        description: dto.description,
      },
      include: {
        task: {
          select: { taskId: true, taskName: true, projectId: true, project: { select: { projectId: true, projectName: true } } },
        },
      },
    });

    return this.mapToResponse(entry);
  }

  async findAll(filters: TimeEntryFiltersDto, userId: bigint): Promise<{ data: TimeEntryResponseDto[], total: number }> {
    const tenantId = this.tenantContext.requireTenantId();
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: any = { 
      userId,
      task: {
        project: {
          tenantId,
        },
      },
    };

    if (filters.taskId) {
      where.taskId = BigInt(filters.taskId);
    }

    if (filters.startDate) {
      where.date = { ...where.date, gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.date = { ...where.date, lte: new Date(filters.endDate) };
    }

    const [entries, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where,
        include: {
          task: {
            select: { taskId: true, taskName: true, projectId: true, project: { select: { projectId: true, projectName: true } } },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return {
      data: entries.map(e => this.mapToResponse(e)),
      total,
    };
  }

  async findWeekly(startDateStr: string, userId: bigint): Promise<WeeklyTimesheetResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const startDate = new Date(startDateStr);
    // Ensure we start from Monday
    const dayOfWeek = startDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diff);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // Fetch entries for the week
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: {
        task: {
          select: { 
            taskId: true, 
            taskName: true, 
            projectId: true, 
            project: { select: { projectId: true, projectName: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group by task
    const taskMap = new Map<string, WeeklyTimeEntryDto>();
    
    for (const entry of entries) {
      const taskId = entry.taskId.toString();
      const entryDate = new Date(entry.date);
      const dayIndex = Math.floor((entryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (!taskMap.has(taskId)) {
        taskMap.set(taskId, {
          taskId,
          taskName: entry.task.taskName,
          projectId: entry.task.projectId?.toString() || null,
          projectName: entry.task.project?.projectName || null,
          projectColor: this.getProjectColor(entry.task.project?.projectName || ''),
          days: [0, 0, 0, 0, 0, 0, 0],
          entryIds: [null, null, null, null, null, null, null],
          totalHours: 0,
        });
      }

      const taskEntry = taskMap.get(taskId)!;
      if (dayIndex >= 0 && dayIndex < 7) {
        taskEntry.days[dayIndex] = Number(entry.hours);
        taskEntry.entryIds[dayIndex] = entry.timeEntryId.toString();
        taskEntry.totalHours += Number(entry.hours);
      }
    }

    const weeklyEntries = Array.from(taskMap.values());
    
    // Calculate daily totals
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    for (const entry of weeklyEntries) {
      for (let i = 0; i < 7; i++) {
        dailyTotals[i] += entry.days[i];
      }
    }

    const totalHours = dailyTotals.reduce((sum, h) => sum + h, 0);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      entries: weeklyEntries,
      totalHours,
      tasksLogged: weeklyEntries.length,
      dailyTotals,
    };
  }

  async update(timeEntryId: string, dto: UpdateTimeEntryDto, userId: bigint): Promise<TimeEntryResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const entry = await this.prisma.timeEntry.findFirst({
      where: { 
        timeEntryId: BigInt(timeEntryId) ,
        task: {
          project: {
            tenantId,
          },
        },
      },
    });

    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only edit your own time entries');
    }

    const updated = await this.prisma.timeEntry.update({
      where: { timeEntryId: BigInt(timeEntryId) },
      data: {
        hours: dto.hours !== undefined ? new Decimal(dto.hours) : undefined,
        description: dto.description,
      },
      include: {
        task: {
          select: { taskId: true, taskName: true, projectId: true, project: { select: { projectId: true, projectName: true } } },
        },
      },
    });

    return this.mapToResponse(updated);
  }

  async delete(timeEntryId: string, userId: bigint): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const entry = await this.prisma.timeEntry.findFirst({
      where: { 
        timeEntryId: BigInt(timeEntryId),
        task: {
          project: {
            tenantId,
          },
        },
      },
    });

    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only delete your own time entries');
    }

    await this.prisma.timeEntry.delete({
      where: { timeEntryId: BigInt(timeEntryId) },
    });
  }

  async findByTask(taskId: string): Promise<TimeEntryResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const entries = await this.prisma.timeEntry.findMany({
      where: { 
        taskId: BigInt(taskId),
        task: {
          project: {
            tenantId,
          },
        },
      },
      include: {
        task: {
          select: { taskId: true, taskName: true, projectId: true, project: { select: { projectId: true, projectName: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });
    return entries.map(e => this.mapToResponse(e));
  }

  private mapToResponse(entry: any): TimeEntryResponseDto {
    return {
      timeEntryId: entry.timeEntryId.toString(),
      taskId: entry.taskId.toString(),
      userId: entry.userId.toString(),
      date: entry.date.toISOString().split('T')[0],
      hours: Number(entry.hours),
      description: entry.description,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      task: entry.task ? {
        taskId: entry.task.taskId.toString(),
        taskName: entry.task.taskName,
        projectId: entry.task.projectId?.toString() || null,
        projectName: entry.task.project?.projectName || null,
      } : undefined,
    };
  }

  private getProjectColor(projectName: string): string {
    // Generate consistent color based on project name
    const colors = ['#6366F1', '#10B981', '#FBBF24', '#EC4899', '#8B5CF6', '#F97316', '#14B8A6', '#EF4444'];
    let hash = 0;
    for (let i = 0; i < projectName.length; i++) {
      hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
