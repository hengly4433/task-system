import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database';
import { CreateReminderDto, ReminderResponseDto } from './dto';
import { TenantContextService } from '../../common/tenant';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(taskId: string, dto: CreateReminderDto): Promise<ReminderResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Verify task belongs to tenant
    const task = await this.prisma.task.findFirst({
      where: {
        taskId: BigInt(taskId),
        project: {
          tenantId,
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found in this tenant');

    const reminder = await this.prisma.taskReminder.create({
      data: { taskId: BigInt(taskId), reminderText: dto.reminderText, reminderTime: new Date(dto.reminderTime) },
    });
    return this.mapToResponse(reminder);
  }

  async findByTask(taskId: string): Promise<ReminderResponseDto[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const reminders = await this.prisma.taskReminder.findMany({
      where: { 
        taskId: BigInt(taskId),
        task: {
          project: {
            tenantId,
          },
        },
      },
      orderBy: { reminderTime: 'asc' },
    });
    return reminders.map((r) => this.mapToResponse(r));
  }

  async delete(reminderId: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const reminder = await this.prisma.taskReminder.findFirst({ 
      where: { 
        reminderId: BigInt(reminderId),
        task: {
          project: {
            tenantId,
          },
        },
      },
    });
    if (!reminder) throw new NotFoundException('Reminder not found in this tenant');
    await this.prisma.taskReminder.delete({ where: { reminderId: BigInt(reminderId) } });
  }

  private mapToResponse(r: { reminderId: bigint; taskId: bigint; reminderText: string; reminderTime: Date }): ReminderResponseDto {
    return { reminderId: r.reminderId.toString(), taskId: r.taskId.toString(), reminderText: r.reminderText, reminderTime: r.reminderTime.toISOString() };
  }
}
